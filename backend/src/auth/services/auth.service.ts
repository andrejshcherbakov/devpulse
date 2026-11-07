import { randomInt, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions, Response } from 'express';
import { DataSource } from 'typeorm';

import { env } from '@devpulse/env/api';
import { generateLoginChallenge, typeIdGenerator, verifyClientLoginProof } from '@devpulse/lib';

import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { normalizeEmail } from '../../common/utils/normalize-email';
import {
  VERIFICATION_MAILER,
  type VerificationMailer,
} from '../../email/services/verification-mailer.service';
import { RedisService } from '../../redis/services/redis.service';
import { User } from '../../users/entities/user.entity';
import { UserEncryption } from '../../users/entities/user-encryption.entity';
import { UsersService } from '../../users/services/users.service';
import { bannedWords, blockedUsernames, reservedUsernames } from '../constants/banned-names';
import { BeginSignupRequestDto } from '../dto/requests/begin-signup-request.dto';
import { CompleteSignupRequestDto } from '../dto/requests/complete-signup-request.dto';
import { LoginBeginRequestDto } from '../dto/requests/login-begin-request.dto';
import { VerifySignUpRequestDto } from '../dto/requests/verify-signup-request.dto';
import { SignUpCompleteResponseDto } from '../dto/response/sign-up-complete.response.dto';
import { VerifySignUpResponseDto } from '../dto/response/verify-signup-response.dto';
import {
  LoginBeginResult,
  LoginSession,
  SignupCodeRecord,
  SignupTokenPayload,
} from '../interfaces/auth-internal.interface';

const CODE_EXPIRY_MINUTES = 10;
const CODE_EXPIRY_SECONDS = CODE_EXPIRY_MINUTES * 60;
const MAX_CODE_ATTEMPTS = 5;
const SIGNUP_TOKEN_TTL = '15m';
const SIGNUP_TOKEN_AUDIENCE = 'signup';
const LOGIN_SESSION_TTL_SECONDS = 300;

const ACCESS_COOKIE_NAME = 'access_token';
const ACCESS_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN === undefined ? {} : { domain: env.COOKIE_DOMAIN }),
};

const SIGNUP_SUCCESS_MESSAGE = 'A verification code has been sent to your email.';
const INVALID_CODE_MESSAGE = 'Invalid or expired verification code';
const INVALID_SIGNUP_TOKEN_MESSAGE = 'Invalid or expired signup token';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const signupCodeKey = (email: string): string => `signup_code:${email}`;
const loginSessionKey = (email: string): string => `login_session:${email}`;

const generateVerificationCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

const safeEqual = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

const isSignupTokenPayload = (value: unknown): value is SignupTokenPayload =>
  typeof value === 'object' &&
  value !== null &&
  'email' in value &&
  'displayName' in value &&
  typeof value.email === 'string' &&
  typeof value.displayName === 'string';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private disposableDomains = new Set<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @Inject(VERIFICATION_MAILER)
    private readonly verificationMailer: VerificationMailer,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.loadDisposableDomains();
  }

  public async signupBegin(dto: BeginSignupRequestDto): Promise<MessageResponseDto> {
    const { displayName } = dto;
    const email = normalizeEmail(dto.email);

    this.logger.log(`Starting signup process for email: ${email}`);

    if (this.isDisposableEmail(email)) {
      this.logger.warn(`Signup attempt with disposable email: ${email}`);
      return { message: SIGNUP_SUCCESS_MESSAGE };
    }

    if (!this.isDisplayNameAllowed(displayName)) {
      this.logger.warn(`Signup attempt with banned display name: ${displayName}`);
      return { message: SIGNUP_SUCCESS_MESSAGE };
    }

    const [userByEmail, userByDisplayName] = await Promise.all([
      this.usersService.findByEmail(email),
      this.usersService.findByDisplayName(displayName),
    ]);

    if (userByEmail || userByDisplayName) {
      this.logger.warn(`Signup attempt for existing email or display name: ${email}`);
      return { message: SIGNUP_SUCCESS_MESSAGE };
    }

    const code = generateVerificationCode();
    const record: SignupCodeRecord = {
      code,
      displayName,
      attempts: 0,
      expiresAt: Date.now() + CODE_EXPIRY_SECONDS * 1000,
    };

    try {
      await this.redisService.set(signupCodeKey(email), record, CODE_EXPIRY_SECONDS);

      await this.verificationMailer.sendVerificationCode(email, {
        code,
        displayName,
        expiresInMinutes: CODE_EXPIRY_MINUTES,
      });
    } catch (error) {
      this.logger.error(`Failed to issue verification code for ${email}: ${String(error)}`);
      throw new InternalServerErrorException(
        'Could not generate verification code. Please try again.',
      );
    }

    return { message: SIGNUP_SUCCESS_MESSAGE };
  }

  public async signUpVerify(dto: VerifySignUpRequestDto): Promise<VerifySignUpResponseDto> {
    const { code } = dto;
    const email = normalizeEmail(dto.email);

    this.logger.log(`Verifying signup for email: ${email}`);

    const key = signupCodeKey(email);
    const record = await this.redisService.get<SignupCodeRecord>(key);

    if (!record || record.expiresAt <= Date.now()) {
      this.logger.warn(`Missing or expired verification code for email: ${email}`);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    if (!safeEqual(record.code, code)) {
      this.logger.warn(`Invalid verification code for email: ${email}`);
      await this.registerFailedCodeAttempt(key, record);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    await this.redisService.del(key);

    const signupToken = this.jwtService.sign(
      { email, displayName: record.displayName },
      { expiresIn: SIGNUP_TOKEN_TTL, audience: SIGNUP_TOKEN_AUDIENCE },
    );

    return {
      message: 'Email verified successfully.',
      signupToken,
    };
  }

  public async signUpComplete(
    dto: CompleteSignupRequestDto,
    signUpToken: string,
    res: Response,
  ): Promise<SignUpCompleteResponseDto> {
    const {
      salt,
      verifier,
      publicKey,
      encryptedPrivateKey,
      iv,
      tag,
      protectedKey,
      protectedKeyIV,
      protectedKeyTag,
      timezone,
    } = dto;

    const { email, displayName } = this.verifySignupToken(signUpToken);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const encryptionRepo = manager.getRepository(UserEncryption);

      const duplicate = await userRepo.findOne({
        where: [{ email }, { displayName }],
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('User with this email or display name already exists');
      }

      const user = await userRepo.save(
        userRepo.create({
          id: typeIdGenerator('users'),
          email,
          displayName,
          timezone,
        }),
      );

      await encryptionRepo.save(
        encryptionRepo.create({
          id: typeIdGenerator('encryption'),
          user,
          iv,
          salt,
          verifier,
          publicKey,
          encryptedPrivateKey,
          tag,
          protectedKey,
          protectedKeyIV,
          protectedKeyTag,
        }),
      );

      return user;
    });

    this.logger.log(`User created successfully: ${savedUser.id}`);

    this.setAccessTokenCookie(res, this.signAccessToken(savedUser));

    return {
      message: 'Registration completed successfully',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.displayName,
        timezone: savedUser.timezone,
        hourlyRate: savedUser.hourlyRate,
        currency: savedUser.currency,
        hasOpenaiKey: false,
      },
    };
  }

  public async loginBegin(dto: LoginBeginRequestDto): Promise<LoginBeginResult> {
    const { clientPublicKey } = dto;
    const email = normalizeEmail(dto.email);

    this.logger.log(`Starting login process for email: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user?.isActive || !user.encryption.salt || !user.encryption.verifier) {
      this.logger.warn(`Login attempt for unknown or inactive email: ${email}`);
      throw new BadRequestException('User does not exist');
    }

    const serverPublicKey = generateLoginChallenge();

    const session: LoginSession = {
      userId: user.id,
      clientPublicKey,
      serverPublicKey,
    };

    await this.redisService.set(loginSessionKey(email), session, LOGIN_SESSION_TTL_SECONDS);

    return {
      salt: user.encryption.salt,
      serverPublicKey,
    };
  }

  public async loginVerify(
    rawEmail: string,
    clientProof: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const email = normalizeEmail(rawEmail);

    this.logger.log(`Verifying login for email: ${email}`);

    const key = loginSessionKey(email);
    const session = await this.redisService.get<LoginSession>(key);

    if (!session) {
      this.logger.warn(`No active login session found for email: ${email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // The session is single-use: any attempt, successful or not, consumes it.
    await this.redisService.del(key);

    const user = await this.usersService.findById(session.userId);
    const verifier = user?.encryption.verifier;

    if (!user?.isActive || !verifier) {
      this.logger.error(`Missing, inactive or incomplete user for ID: ${session.userId}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isValidProof = verifyClientLoginProof({
      verifier,
      clientPublicKey: session.clientPublicKey,
      serverPublicKey: session.serverPublicKey,
      clientProof,
    });

    if (!isValidProof) {
      this.logger.warn(`Invalid client proof for email: ${email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = this.signAccessToken(user);
    this.setAccessTokenCookie(res, accessToken);

    this.logger.log(`Login successful for user: ${user.id}`);

    return { accessToken };
  }

  public logout(res: Response): MessageResponseDto {
    res.clearCookie(ACCESS_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
    return { message: 'Logged out successfully' };
  }

  private verifySignupToken(token: string): SignupTokenPayload {
    try {
      const payload: unknown = this.jwtService.verify<object>(token, {
        audience: SIGNUP_TOKEN_AUDIENCE,
      });

      if (isSignupTokenPayload(payload)) {
        return payload;
      }
      this.logger.warn('Signup token has an unexpected payload');
    } catch (error) {
      this.logger.warn(`Invalid or expired signup token: ${String(error)}`);
    }

    throw new UnauthorizedException(INVALID_SIGNUP_TOKEN_MESSAGE);
  }

  private signAccessToken(user: Pick<User, 'id' | 'email' | 'displayName'>): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  }

  private setAccessTokenCookie(res: Response, accessToken: string): void {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
  }

  /**
   * Best-effort limit on wrong guesses. Not atomic: pair it with a rate limiter
   * (e.g. @nestjs/throttler) or an atomic Redis INCR.
   */
  private async registerFailedCodeAttempt(key: string, record: SignupCodeRecord): Promise<void> {
    const attempts = record.attempts + 1;
    const remainingSeconds = Math.ceil((record.expiresAt - Date.now()) / 1000);

    if (attempts >= MAX_CODE_ATTEMPTS || remainingSeconds <= 0) {
      await this.redisService.del(key);
      return;
    }

    await this.redisService.set(key, { ...record, attempts }, remainingSeconds);
  }

  private isDisplayNameAllowed(displayName: string): boolean {
    const normalized = displayName.normalize('NFKC').toLowerCase();

    return !(
      blockedUsernames.includes(normalized) ||
      reservedUsernames.includes(normalized) ||
      bannedWords.some((word) => normalized.includes(word))
    );
  }

  private async loadDisposableDomains(): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'disposable_emails.txt');
      const disposableEmailsText = await fs.readFile(filePath, 'utf8');
      const domains = disposableEmailsText
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      this.disposableDomains = new Set(domains);
      this.logger.log(`Loaded ${String(this.disposableDomains.size)} disposable email domains.`);
    } catch (error) {
      this.logger.warn(
        'Could not load disposable email domains. Proceeding without checks.',
        String(error),
      );
    }
  }

  private isDisposableEmail(email: string): boolean {
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) return false;
    return this.disposableDomains.has(email.slice(atIndex + 1).toLowerCase());
  }
}

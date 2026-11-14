'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { buildSignupCryptoPayload } from '@/features/auth/crypto';
import { authService } from '@/shared/api/services';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { useLanguage } from '@/shared/i18/language-context';
import { getErrorMessage } from '@/shared/lib/error';

import { useAuth } from '../context';

interface RegisterValues {
  displayName: string;
  email: string;
  password: string;
}

interface VerifyValues {
  code: string;
}

export function RegisterForm(): JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerSchema = z.object({
    displayName: z
      .string()
      .min(3, t('Minimum 3 characters'))
      .max(20, t('Maximum 20 characters'))
      .regex(/^[a-zA-Z0-9_]+$/, t('Only letters, numbers and underscores allowed')),
    email: z.string().email(t('Invalid email')),
    password: z.string().min(8, t('Password must be at least 8 characters')),
  });
  const verifySchema = z.object({
    code: z.string().length(6, t('Verification code must be exactly 6 characters')),
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (step === 'verify') {
      verifyForm.reset({ code: '' });
    }
  }, [step, verifyForm]);

  const onRegisterSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.signupBegin(values.email, values.displayName);
      setStep('verify');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (values: VerifyValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const { email, password } = registerForm.getValues();

      const verifyRes = await authService.signupVerify(email, values.code);
      const signupToken = verifyRes.signupToken;

      const cryptoPayload = await buildSignupCryptoPayload(password);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const completeRes = await authService.signupComplete(
        { ...cryptoPayload, timezone },
        signupToken,
      );

      login(completeRes.user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { email, displayName } = registerForm.getValues();
      await authService.signupBegin(email, displayName);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const renderRegisterForm = () => (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t('Create account')}</h2>
        <p className="mt-1 text-sm text-secondary">{t('Enter your details to create an account')}</p>
      </div>

      <Form {...registerForm}>
        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
          <FormField
            control={registerForm.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Username')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="johndoe"
                    autoComplete="username"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-coral" />
              </FormItem>
            )}
          />

          <FormField
            control={registerForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-coral" />
              </FormItem>
            )}
          />

          <FormField
            control={registerForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Password')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-coral" />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-2 w-full" loading={isLoading}>
            {t('Continue')}
          </Button>
        </form>
      </Form>

      <p className="flex items-center justify-center gap-1 text-center text-sm text-secondary">
        {t('Already have an account?')}
        <Button
          variant="link"
          asChild
          className="h-auto p-0 font-medium no-underline hover:text-brand"
        >
          <Link href="/login">{t('Log in')}</Link>
        </Button>
      </p>
    </>
  );

  const renderVerifyForm = () => (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t('Email verification')}</h2>
        <p className="mt-1 text-sm text-secondary">{t('Enter the 6-digit code sent to your email')}</p>
      </div>

      <Form {...verifyForm}>
        <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
          <FormField
            control={verifyForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Verification code')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456"
                    autoFocus
                    autoComplete="one-time-code"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-coral" />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-2 w-full" loading={isLoading}>
            {t('Verify & create')}
          </Button>
        </form>
      </Form>

      <p className="flex items-center justify-center gap-1 text-center text-sm text-secondary">
        {t("Didn't receive the email?")}
        <Button
          variant="link"
          type="button"
          onClick={handleResendCode}
          disabled={isLoading}
          className="h-auto p-0 font-medium no-underline hover:text-brand"
        >
          {t('Resend code')}
        </Button>
      </p>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
      {error && (
        <div className="rounded-[10px] border border-red-coral/30 bg-red-coral/10 p-3 text-sm text-red-coral">
          {error}
        </div>
      )}
      {step === 'register' ? renderRegisterForm() : renderVerifyForm()}
    </div>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { buildLoginCryptoPayload, generateKeyPair } from '../crypto';

interface LoginValues {
  email: string;
  password: string;
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginSchema = z.object({
    email: z.string().email(t('Invalid email')),
    password: z.string().min(1, t('Password is required')),
  });

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const ephemeralKeys = generateKeyPair();

      const beginRes = await authService.loginBegin(values.email, ephemeralKeys.publicKey);

      const { clientProof } = await buildLoginCryptoPayload(
        values.password,
        beginRes.salt,
        beginRes.serverPublicKey,
        ephemeralKeys.publicKey,
      );

      await authService.loginVerify(values.email, clientProof);
      const user = await authService.getMe();

      login(user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t('Welcome back')}</h2>
        <p className="mt-1 text-sm text-secondary">
          {t('Enter your credentials to access your account.')}
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-coral/30 bg-red-coral/10 p-3 text-sm text-red-coral">
          {error}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
                    autoFocus
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
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t('Password')}</FormLabel>
                  <Button
                    variant="link"
                    asChild
                    className="h-auto p-0 text-xs font-medium no-underline"
                  >
                    <Link href="/forgot-password">{t('Forgot?')}</Link>
                  </Button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-coral" />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-4 w-full" loading={isLoading}>
            {t('Sign in')}
          </Button>
        </form>
      </Form>

      <p className="flex items-center justify-center gap-1 text-center text-sm text-secondary">
        {t("Don't have an account?")}
        <Button
          variant="link"
          asChild
          className="h-auto p-0 font-medium no-underline hover:text-brand"
        >
          <Link href="/register">{t('Create one')}</Link>
        </Button>
      </p>
    </div>
  );
}

'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useLanguage } from '@/shared/i18/language-context';

interface RevealedKeyDialogProps {
  apiKey: string | null;
  onClose: () => void;
}

export function RevealedKeyDialog({ apiKey, onClose }: RevealedKeyDialogProps): JSX.Element {
  const [hasCopied, setHasCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  return (
    <Dialog open={apiKey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Your new API key')}</DialogTitle>
          <DialogDescription>{t("Copy it now — it won't be shown again.")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-gray-alpha-50 px-3 py-2.5">
          <code className="flex-1 font-mono text-xs break-all text-foreground">{apiKey}</code>
          <Button size="sm" onClick={handleCopy}>
            {hasCopied ? (
              <>
                <Check className="mr-1.5 h-4 w-4 text-brand" strokeWidth={1.5} />
                {t('Copied')}
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                {t('Copy')}
              </>
            )}
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button size="sm" onClick={onClose}>
            {t('Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

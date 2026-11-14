'use client';

import { type JSX } from 'react/jsx-runtime';

import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { METHOD_STYLES } from '@/shared/lib/docs-constants';

import { CodeTabs } from './code-tabs';

interface Parameter {
  name: string;
  in: 'header' | 'query' | 'path';
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
    enum?: Array<string>;
    example?: unknown;
    default?: unknown;
  };
  example?: unknown;
}

interface EndpointCardProps {
  method: string;
  path: string;
  url: string;
  summary: string;
  description?: string;
  scopes?: Array<string>;
  parameters?: Array<Parameter>;
  responseExample?: string;
  id: string;
}

export function EndpointCard({
  method,
  path,
  url,
  summary,
  description,
  scopes,
  parameters,
  responseExample,
  id,
}: EndpointCardProps): JSX.Element {
  const { t } = useLanguage();
  const hasParameters = parameters && parameters.length > 0;
  const methodStyle = METHOD_STYLES[method as keyof typeof METHOD_STYLES] || METHOD_STYLES.GET;

  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'rounded-md border px-2.5 py-1 font-mono text-xs font-medium uppercase',
                methodStyle,
              )}
            >
              {method}
            </span>
            <code className="min-w-0 overflow-x-auto py-1 font-mono text-sm whitespace-nowrap text-foreground">
              {path}
            </code>
          </div>

          <div>
            <h3 className="mb-1 text-lg font-medium text-foreground">{summary}</h3>
            {description && <p className="text-sm text-secondary">{description}</p>}
          </div>

          {scopes && scopes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-aspid/20 bg-purple-aspid/10 px-2.5 py-1 text-xs font-medium text-purple-aspid"
                >
                  <span aria-hidden="true">🔒</span>
                  {scope}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasParameters && (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <div className="border-b border-border bg-gray-alpha-50 px-4 py-2.5">
              <span className="text-xs font-medium tracking-wider text-subtle uppercase">
                Parameters
              </span>
            </div>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-alpha-50">
                  <th className="w-32 px-4 py-2 text-left font-medium text-subtle">{t('Name')}</th>
                  <th className="w-24 px-4 py-2 text-left font-medium text-subtle">{t('Location')}</th>
                  <th className="w-24 px-4 py-2 text-left font-medium text-subtle">{t('Type')}</th>
                  <th className="px-4 py-2 text-left font-medium text-subtle">{t('Description')}</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param) => (
                  <tr key={param.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-foreground">{param.name}</code>
                      {param.required && <span className="ml-1.5 text-xs text-red-coral">*</span>}
                      {!param.required && (
                        <span className="ml-1.5 text-[10px] text-subtle">optional</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-subtle capitalize">{param.in}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-subtle">
                        {param.schema?.type ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-secondary">{param.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CodeTabs method={method} url={url} parameters={parameters} response={responseExample} />
      </div>

      <div className="my-8 border-t border-border" />
    </div>
  );
}

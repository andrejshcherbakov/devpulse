'use client';

import { type JSX } from 'react/jsx-runtime';

import { useProjects } from '@/features/projects/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useLanguage } from '@/shared/i18/language-context';

interface ProjectSelectorProps {
  value?: string;
  onChange: (projectId?: string) => void;
}

export function ProjectSelector({ value, onChange }: ProjectSelectorProps): JSX.Element {
  const { data: projects = [] } = useProjects();
  const { t } = useLanguage();

  return (
    <Select value={value ?? 'all'} onValueChange={(v) => onChange(v === 'all' ? undefined : v)}>
      <SelectTrigger className="h-9 w-40">
        <SelectValue placeholder={t('All projects')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('All projects')}</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface ExportRow {
  date: string;
  projectName: string;
  gitBranch: string;
  activeSeconds: number;
  focusScore: number;
  earnedMoney: number;
  language: string;
}

export interface ExportFormatter {
  readonly format: string;
  readonly contentType: string;
  readonly fileExtension: string;
  serialize(rows: Array<ExportRow>): string;
}

export const EXPORT_FORMATTER = Symbol('EXPORT_FORMATTER');

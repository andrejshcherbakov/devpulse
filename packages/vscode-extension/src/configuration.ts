import * as vscode from 'vscode';

const CONFIG_NAMESPACE = 'devpulse';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function configuredString(key: string): string {
  return vscode.workspace.getConfiguration(CONFIG_NAMESPACE).get<string>(key, '').trim();
}

function trimTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith('/')) result = result.slice(0, -1);
  return result;
}

export function getServiceUrlConfigurationError(value: string, label: string): string | null {
  if (value === '') return `${label} is not configured`;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return `${label} must be a valid URL`;
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return `${label} must not contain credentials`;
  }
  if (parsed.search !== '' || parsed.hash !== '') {
    return `${label} must not contain query parameters or fragments`;
  }

  if (parsed.protocol === 'https:') return null;
  if (parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname)) return null;

  return `${label} must use HTTPS. Plain HTTP is allowed only for localhost`;
}

export function getApiUrlConfigurationError(): string | null {
  return getServiceUrlConfigurationError(configuredString('apiUrl'), 'DevPulse API URL');
}

export function requireApiBaseUrl(): string {
  const value = configuredString('apiUrl');
  const error = getServiceUrlConfigurationError(value, 'DevPulse API URL');
  if (error !== null) throw new Error(error);
  return trimTrailingSlashes(value);
}

export function getDashboardUrl(): string | null {
  const value = configuredString('dashboardUrl');
  return getServiceUrlConfigurationError(value, 'DevPulse dashboard URL') === null
    ? trimTrailingSlashes(value)
    : null;
}

export function isTrackingEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_NAMESPACE).get<boolean>('enabled', true);
}

export function shouldSendFilePaths(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_NAMESPACE).get<boolean>('sendFilePaths', true);
}

export function shouldSendTerminalCommands(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE)
    .get<boolean>('sendTerminalCommands', true);
}

export function shouldSendCommitMessages(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE)
    .get<boolean>('sendCommitMessages', true);
}

export function shouldSendSymbolNames(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE)
    .get<boolean>('sendSymbolNames', false);
}

export function shouldDetectAiAssistance(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE)
    .get<boolean>('detectAiAssistance', true);
}

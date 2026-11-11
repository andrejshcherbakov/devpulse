import type { WorkSession } from '../../telemetry/entities/work-session.entity';
import type { CommandKindFacts, TerminalFacts } from '../interfaces/day-facts.interface';

export type TerminalCommand = WorkSession['terminalCommands'][number];

function isFailed(command: TerminalCommand): boolean {
  return command.exitCode !== null && command.exitCode !== 0;
}

function commandKindFacts(
  commands: ReadonlyArray<TerminalCommand>,
  kind: string,
): CommandKindFacts | null {
  const runs = commands
    .filter((command) => command.kind === kind)
    .sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp));

  if (runs.length === 0) return null;

  const lastFinished = runs.findLast((command) => command.exitCode !== null);

  return {
    runs: runs.length,
    failed: runs.filter((command) => isFailed(command)).length,
    lastRunPassed: lastFinished ? lastFinished.exitCode === 0 : null,
  };
}

export function buildTerminalFacts(commands: ReadonlyArray<TerminalCommand>): TerminalFacts {
  return {
    totalRuns: commands.length,
    failedRuns: commands.filter((command) => isFailed(command)).length,
    tests: commandKindFacts(commands, 'test'),
    builds: commandKindFacts(commands, 'build'),
    lint: commandKindFacts(commands, 'lint'),
  };
}

export interface SymbolRange {
  name: string;
  startLine: number;
  endLine: number;
}

export function selectTouchedSymbolNames(
  changedLines: Iterable<number>,
  ranges: ReadonlyArray<SymbolRange>,
  limit: number,
): Array<string> {
  const narrowestFirst = [...ranges].sort(
    (first, second) => first.endLine - first.startLine - (second.endLine - second.startLine),
  );
  const names = new Set<string>();

  for (const line of changedLines) {
    const match = narrowestFirst.find((range) => line >= range.startLine && line <= range.endLine);
    if (match) names.add(match.name);
    if (names.size >= limit) break;
  }

  return [...names];
}

export type IdGen = (prefix: string) => string;

export function makeIdGen(): IdGen {
  const counters = new Map<string, number>();
  return (prefix: string): string => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}:${next}`;
  };
}

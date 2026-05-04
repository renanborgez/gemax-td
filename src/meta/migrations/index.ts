import { CURRENT_VERSION, type SaveDataLatest } from '@/meta/schema';

export type Migration = {
  from: number;
  to: number;
  migrate: (data: unknown) => unknown;
};

export const MIGRATIONS: Migration[] = [
  // Future entries:
  // { from: 1, to: 2, migrate: (d) => /* transform */ d as unknown },
];

export function runMigrations(blob: { version: number; data: unknown }): SaveDataLatest {
  let { version, data } = blob;
  for (const m of MIGRATIONS) {
    if (version === m.from) {
      data = m.migrate(data);
      version = m.to;
    }
  }
  if (version !== CURRENT_VERSION) {
    throw new Error(`No migration path from v${version} to v${CURRENT_VERSION}`);
  }
  return data as SaveDataLatest;
}

import type { ChapterDef } from '@/content/types';

/**
 * Chapter registry. 10 chapters, 10 missions each = 100 missions total.
 *
 * Mission IDs follow the convention `lvl-c{chapter}-m{mission}`, both
 * zero-indexed; the level generator (`@/content/levelGenerator`) expects this
 * format and the registry matches `finaleLevelId` to mission 9 (the 10th
 * mission) of each chapter.
 *
 * Boss-enemy assignments are intentionally one boss per chapter — the player
 * should encounter each boss kind in exactly one finale.
 */

export const CHAPTERS: ReadonlyArray<ChapterDef> = [
  {
    index: 0,
    name: 'The Intranet',
    subtitle: 'Corporate firewalls. First contact.',
    paletteAccent: '#7AFCC9',
    artKey: 'chapter/intranet',
    briefing:
      'Breach an SMB network. Worms probe the perimeter; trojans test your firewall. ' +
      'Hold the line until the rootkit reveals itself.',
    bossEnemyKind: 'rootkit',
    finaleLevelId: 'lvl-c0-m9',
  },
  {
    index: 1,
    name: 'Uplink',
    subtitle: 'Outbound channel — keep it closed.',
    paletteAccent: '#44EEFF',
    artKey: 'chapter/uplink',
    briefing:
      'A staging server is exfiltrating data. Cut the uplink before payloads escape upstream — ' +
      'a Wraith escort is shepherding the dump.',
    bossEnemyKind: 'wraith',
    finaleLevelId: 'lvl-c1-m9',
  },
  {
    index: 2,
    name: 'Cloud Layer',
    subtitle: 'Burst into the tenancy. Burn the host.',
    paletteAccent: '#FFB14E',
    artKey: 'chapter/cloud',
    briefing:
      'Multi-tenant infra is leaking workloads. Cut the bastion edge, then bring the Hypervisor down ' +
      'before it reissues credentials across the fleet.',
    bossEnemyKind: 'hypervisor',
    finaleLevelId: 'lvl-c2-m9',
  },
  {
    index: 3,
    name: 'Mainframe',
    subtitle: 'Last hop. Kernel-level intrusion.',
    paletteAccent: '#7AFCC9',
    artKey: 'chapter/mainframe',
    briefing:
      'Kernelghost has root. Hold the perimeter while the unwind sequence runs — every leaked ' +
      'packet rewrites a syscall.',
    bossEnemyKind: 'kernelghost',
    finaleLevelId: 'lvl-c3-m9',
  },
  {
    index: 4,
    name: 'Firmware',
    subtitle: 'Below the OS. Where the bus speaks.',
    paletteAccent: '#FFB14E',
    artKey: 'chapter/firmware',
    briefing:
      'Microcode has been silently rewritten. A Firmware Leech sits between every read and write — ' +
      'cull the parasite before it siphons every packet.',
    bossEnemyKind: 'firmware-leech',
    finaleLevelId: 'lvl-c4-m9',
  },
  {
    index: 5,
    name: 'Darknet',
    subtitle: 'Off-grid traffic. Off-grid threats.',
    paletteAccent: '#FF7A8A',
    artKey: 'chapter/darknet',
    briefing:
      'Onion routes cluster around a single relay. The Darknet Titan walks the corridor — ' +
      'kill it cleanly or its escort multiplies.',
    bossEnemyKind: 'darknet-titan',
    finaleLevelId: 'lvl-c5-m9',
  },
  {
    index: 6,
    name: 'Quantum',
    subtitle: 'Superposed payloads. Split your fire.',
    paletteAccent: '#44EEFF',
    artKey: 'chapter/quantum',
    briefing:
      'Probability harvesters phase between routing tables. The Quantum Shade only resolves when ' +
      'observed — sustained DPS only.',
    bossEnemyKind: 'quantum-shade',
    finaleLevelId: 'lvl-c6-m9',
  },
  {
    index: 7,
    name: 'Logic',
    subtitle: 'Boolean armor. Imperative response.',
    paletteAccent: '#FFB14E',
    artKey: 'chapter/logic',
    briefing:
      'A Logic Gate has rewritten the routing fabric. Burst its core; expect a daemon swarm on death.',
    bossEnemyKind: 'logic-gate',
    finaleLevelId: 'lvl-c7-m9',
  },
  {
    index: 8,
    name: 'Void',
    subtitle: 'Off-policy traffic. Off-record death.',
    paletteAccent: '#8A8F99',
    artKey: 'chapter/void',
    briefing:
      'Untracked binaries congregate around the Voidwalker. Heal-aura is brutal — control the swarm ' +
      'before targeting the boss.',
    bossEnemyKind: 'voidwalker',
    finaleLevelId: 'lvl-c8-m9',
  },
  {
    index: 9,
    name: 'Apex',
    subtitle: 'The kernel that writes the kernels.',
    paletteAccent: '#F2F4F7',
    artKey: 'chapter/apex',
    briefing:
      'You are deep in the meta-layer. Apex regenerates from any leaked packet — fail to hold and ' +
      'every loss makes the next harder. Bring everything.',
    bossEnemyKind: 'apex',
    finaleLevelId: 'lvl-c9-m9',
  },
] as const;

export const CHAPTER_BY_INDEX: Readonly<Record<number, ChapterDef>> =
  Object.fromEntries(CHAPTERS.map((c) => [c.index, c]));

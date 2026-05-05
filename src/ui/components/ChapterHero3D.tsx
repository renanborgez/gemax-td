import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from 'react-native-reanimated';
import { COLORS } from '@/render/theme';

/**
 * Per-chapter 3D hero scene — Skia wireframe diorama with a hand-rolled
 * perspective projection. The camera slowly orbits a small set of objects
 * arranged on a ground grid; each chapter ships its own mesh layout so the
 * title screen reads as "look at the place you're about to break into."
 *
 * Render path:
 *   - `useFrameCallback` ticks `time` on the UI thread.
 *   - One `useDerivedValue` builds two `SkPath`s per frame — `groundPath`
 *     (ground grid + dim props, drawn at low alpha) and `accentPath` (hero
 *     objects, drawn crisp + with a soft glow).
 *   - Three `<Path>` elements paint the scene.
 *
 * No new deps: Skia + Reanimated only. THREE.js / expo-gl would be overkill
 * for ~50 line segments at 60 FPS.
 */

type Vec3 = readonly [number, number, number];
type Edge = readonly [number, number];

type Mesh = {
  vertices: ReadonlyArray<Vec3>;
  edges: ReadonlyArray<Edge>;
};

type SceneObject = {
  mesh: Mesh;
  /** World-space placement. */
  position: Vec3;
  /** Uniform scale. */
  scale: number;
  /** Rotation around local Y axis (rad/sec). 0 = static. */
  spinSpeed: number;
  /** Vertical bob offset (tiles). 0 = anchored. */
  bobAmplitude: number;
  /** Bob frequency (Hz). */
  bobFreq: number;
};

type Ground = {
  /** Number of cells per axis (lines drawn = cells+1 each direction). */
  cells: number;
  /** Half-extent in world units; covers [-halfExtent, halfExtent]. */
  halfExtent: number;
  /** Y plane the grid sits on. */
  y: number;
};

type Scene = {
  ground: Ground | null;
  /** Drawn dim (ground + atmosphere). */
  dimObjects: ReadonlyArray<SceneObject>;
  /** Drawn crisp (hero meshes). */
  heroObjects: ReadonlyArray<SceneObject>;
  /** Camera orbit speed (rad/sec). */
  orbitSpeed: number;
  /** Camera tilt-down angle (rad). */
  pitch: number;
  /** Distance from origin to camera. */
  cameraDistance: number;
};

// ─── Reusable mesh primitives ────────────────────────────────────────────────

function box(w: number, h: number, d: number): Mesh {
  const x = w / 2, y = h / 2, z = d / 2;
  const vertices: Vec3[] = [
    [-x, -y, -z], [ x, -y, -z], [ x, -y,  z], [-x, -y,  z],
    [-x,  y, -z], [ x,  y, -z], [ x,  y,  z], [-x,  y,  z],
  ];
  const edges: Edge[] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return { vertices, edges };
}

function octahedron(r: number): Mesh {
  const vertices: Vec3[] = [
    [ 0,  r,  0], [ 0, -r,  0],
    [ r,  0,  0], [-r,  0,  0],
    [ 0,  0,  r], [ 0,  0, -r],
  ];
  const edges: Edge[] = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
  ];
  return { vertices, edges };
}

function pyramid(baseHalf: number, height: number): Mesh {
  const vertices: Vec3[] = [
    [-baseHalf, 0, -baseHalf],
    [ baseHalf, 0, -baseHalf],
    [ baseHalf, 0,  baseHalf],
    [-baseHalf, 0,  baseHalf],
    [0, height, 0],
  ];
  const edges: Edge[] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [0, 4], [1, 4], [2, 4], [3, 4],
  ];
  return { vertices, edges };
}

function hexPrism(r: number, height: number): Mesh {
  const verts: Vec3[] = [];
  const half = height / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    verts.push([Math.cos(a) * r, -half, Math.sin(a) * r]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    verts.push([Math.cos(a) * r, half, Math.sin(a) * r]);
  }
  const edges: Edge[] = [];
  for (let i = 0; i < 6; i++) {
    edges.push([i, (i + 1) % 6]);
    edges.push([6 + i, 6 + ((i + 1) % 6)]);
    edges.push([i, 6 + i]);
  }
  return { vertices: verts, edges };
}

/** Single floating segment used as "stars" / motes; just two vertices. */
function dot(): Mesh {
  return {
    vertices: [[0, 0, 0], [0.04, 0, 0]],
    edges: [[0, 1]],
  };
}

// ─── Scenes ──────────────────────────────────────────────────────────────────

/** Ch.0 The Intranet — server room. Three racks on a grid plane. */
const SCENE_INTRANET: Scene = {
  ground: { cells: 6, halfExtent: 1.6, y: -0.8 },
  dimObjects: [
    // A back wall hint — single horizontal line on the far edge.
    { mesh: box(3.2, 0.02, 0.02), position: [0, -0.78, -1.6], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
  ],
  heroObjects: [
    { mesh: box(0.45, 1.2, 0.45), position: [-1.0, -0.2, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0.02, bobFreq: 0.6 },
    { mesh: box(0.45, 1.4, 0.45), position: [ 0,    -0.1, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0.025, bobFreq: 0.5 },
    { mesh: box(0.45, 1.2, 0.45), position: [ 1.0,  -0.2, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0.02, bobFreq: 0.7 },
  ],
  orbitSpeed: 0.25,
  pitch: 0.45,
  cameraDistance: 4.0,
};

/** Ch.1 Uplink — antenna pyramid on a hilltop, four corner dishes, scattered stars. */
const SCENE_UPLINK: Scene = {
  ground: { cells: 5, halfExtent: 1.8, y: -0.8 },
  dimObjects: [
    // "Stars" — small dots floating above the scene.
    { mesh: dot(), position: [ 1.4, 0.9, -0.6], scale: 1, spinSpeed: 0, bobAmplitude: 0.05, bobFreq: 0.8 },
    { mesh: dot(), position: [-1.2, 1.0,  0.4], scale: 1, spinSpeed: 0, bobAmplitude: 0.06, bobFreq: 0.9 },
    { mesh: dot(), position: [ 0.6, 1.3,  0.9], scale: 1, spinSpeed: 0, bobAmplitude: 0.04, bobFreq: 1.1 },
    { mesh: dot(), position: [-0.4, 1.1, -1.0], scale: 1, spinSpeed: 0, bobAmplitude: 0.05, bobFreq: 0.7 },
  ],
  heroObjects: [
    // Central uplink pyramid.
    { mesh: pyramid(0.55, 1.4), position: [0, -0.8, 0], scale: 1, spinSpeed: 0.6, bobAmplitude: 0, bobFreq: 0 },
    // Four corner dishes (octahedrons).
    { mesh: octahedron(0.22), position: [-1.4, -0.55, -1.0], scale: 1, spinSpeed: 0.4, bobAmplitude: 0.03, bobFreq: 0.6 },
    { mesh: octahedron(0.22), position: [ 1.4, -0.55, -1.0], scale: 1, spinSpeed: -0.4, bobAmplitude: 0.03, bobFreq: 0.7 },
    { mesh: octahedron(0.22), position: [-1.4, -0.55,  1.0], scale: 1, spinSpeed: 0.5,  bobAmplitude: 0.03, bobFreq: 0.5 },
    { mesh: octahedron(0.22), position: [ 1.4, -0.55,  1.0], scale: 1, spinSpeed: -0.5, bobAmplitude: 0.03, bobFreq: 0.8 },
  ],
  orbitSpeed: 0.3,
  pitch: 0.4,
  cameraDistance: 4.2,
};

/** Ch.2 Cloud Layer — no ground; cluster of floating cloud nodes connected by lines. */
const SCENE_CLOUD: Scene = (() => {
  // Five octahedrons at varying heights, each spins; connection-line mesh
  // between them rendered as a sparse "constellation."
  const nodePositions: Vec3[] = [
    [ 0,    0.4, 0],
    [-1.0,  0.9, -0.5],
    [ 1.1,  0.6,  0.4],
    [-0.6, -0.4,  1.0],
    [ 0.8, -0.3, -1.0],
  ];
  const heroObjects: SceneObject[] = nodePositions.map((p, i) => ({
    mesh: octahedron(0.32),
    position: p,
    scale: 1,
    spinSpeed: 0.6 + i * 0.2 * (i % 2 === 0 ? 1 : -1),
    bobAmplitude: 0.06,
    bobFreq: 0.5 + i * 0.15,
  }));
  // Connection lines as a single "constellation" mesh (dim).
  const constellationVerts: Vec3[] = nodePositions.map((p) => [p[0], p[1], p[2]]);
  const constellationEdges: Edge[] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [3, 4],
  ];
  return {
    ground: null,
    dimObjects: [
      {
        mesh: { vertices: constellationVerts, edges: constellationEdges },
        position: [0, 0, 0], scale: 1,
        spinSpeed: 0, bobAmplitude: 0, bobFreq: 0,
      },
      // A few atmospheric dots near the bottom for depth.
      { mesh: dot(), position: [-1.3, -0.9,  0.6], scale: 1, spinSpeed: 0, bobAmplitude: 0.05, bobFreq: 0.6 },
      { mesh: dot(), position: [ 1.4, -0.95, -0.3], scale: 1, spinSpeed: 0, bobAmplitude: 0.05, bobFreq: 0.7 },
      { mesh: dot(), position: [ 0.0, -1.0,  1.1], scale: 1, spinSpeed: 0, bobAmplitude: 0.04, bobFreq: 0.9 },
    ],
    heroObjects,
    orbitSpeed: 0.35,
    pitch: 0.15,
    cameraDistance: 4.5,
  };
})();

/** Ch.3 Mainframe — kernel chamber with central hex core, four corner pillars, orbiting motes. */
const SCENE_MAINFRAME: Scene = {
  ground: { cells: 7, halfExtent: 1.7, y: -0.85 },
  dimObjects: [
    // Four corner pillars — tall thin boxes.
    { mesh: box(0.18, 1.6, 0.18), position: [-1.4, -0.05, -1.4], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    { mesh: box(0.18, 1.6, 0.18), position: [ 1.4, -0.05, -1.4], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    { mesh: box(0.18, 1.6, 0.18), position: [-1.4, -0.05,  1.4], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    { mesh: box(0.18, 1.6, 0.18), position: [ 1.4, -0.05,  1.4], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
  ],
  heroObjects: [
    // Central kernel: hex prism.
    { mesh: hexPrism(0.7, 1.0), position: [0, -0.05, 0], scale: 1, spinSpeed: 0.5, bobAmplitude: 0.03, bobFreq: 0.4 },
    // Six orbiting motes around the kernel — placed in a ring on Y=0.
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return {
        mesh: octahedron(0.14),
        position: [Math.cos(a) * 1.05, 0.0, Math.sin(a) * 1.05] as Vec3,
        scale: 1,
        spinSpeed: 1.2,
        bobAmplitude: 0.08,
        bobFreq: 0.6 + i * 0.07,
      };
    }),
  ],
  orbitSpeed: 0.28,
  pitch: 0.4,
  cameraDistance: 4.6,
};

/** Ch.4 Firmware — circuit-board with chips and trace lines. */
const SCENE_FIRMWARE: Scene = {
  ground: { cells: 8, halfExtent: 1.7, y: -0.7 },
  dimObjects: [
    // Trace runs — long thin boxes laid flat on the board.
    { mesh: box(2.4, 0.04, 0.06), position: [-0.2, -0.68,  0.7], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    { mesh: box(0.06, 0.04, 1.6), position: [ 1.0, -0.68,  0],   scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    { mesh: box(2.0, 0.04, 0.06), position: [ 0.2, -0.68, -0.6], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
  ],
  heroObjects: [
    // Three chip packages.
    { mesh: box(0.6, 0.18, 0.6), position: [-0.9, -0.55, -0.3], scale: 1, spinSpeed: 0, bobAmplitude: 0.015, bobFreq: 0.4 },
    { mesh: box(0.7, 0.22, 0.5), position: [ 0.8, -0.55,  0.4], scale: 1, spinSpeed: 0, bobAmplitude: 0.02,  bobFreq: 0.5 },
    { mesh: box(0.4, 0.16, 0.4), position: [ 0.2, -0.56, -0.7], scale: 1, spinSpeed: 0, bobAmplitude: 0.018, bobFreq: 0.6 },
    // Central capacitor — tall thin pyramid.
    { mesh: pyramid(0.22, 0.9), position: [0, -0.7, 0], scale: 1, spinSpeed: 0.3, bobAmplitude: 0.02, bobFreq: 0.6 },
  ],
  orbitSpeed: 0.22,
  pitch: 0.55,
  cameraDistance: 3.8,
};

/** Ch.5 Darknet — onion routing nodes with connection mesh. */
const SCENE_DARKNET: Scene = (() => {
  // Six nodes arranged in a hex around a central node.
  const heroObjects: SceneObject[] = [];
  const centerVerts: Vec3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p: Vec3 = [Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1];
    heroObjects.push({
      mesh: octahedron(0.22),
      position: p,
      scale: 1,
      spinSpeed: 0.6 + i * 0.08,
      bobAmplitude: 0.04,
      bobFreq: 0.5 + i * 0.05,
    });
    centerVerts.push(p);
  }
  // Center hub.
  heroObjects.push({
    mesh: octahedron(0.4),
    position: [0, 0, 0],
    scale: 1, spinSpeed: -0.4, bobAmplitude: 0.03, bobFreq: 0.4,
  });
  // Web of connections (dim).
  const webEdges: Edge[] = [];
  for (let i = 0; i < 6; i++) webEdges.push([i, (i + 1) % 6]);
  for (let i = 0; i < 6; i++) webEdges.push([i, 6]);
  centerVerts.push([0, 0, 0]);
  return {
    ground: { cells: 6, halfExtent: 1.5, y: -0.6 },
    dimObjects: [
      { mesh: { vertices: centerVerts, edges: webEdges }, position: [0, 0, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    ],
    heroObjects,
    orbitSpeed: 0.32,
    pitch: 0.35,
    cameraDistance: 4.4,
  };
})();

/** Ch.6 Quantum — interference lattice; two phasing octahedra inside a wireframe sphere. */
const SCENE_QUANTUM: Scene = (() => {
  // Wireframe "sphere" approximated as 3 orthogonal octagonal rings.
  const sphereVerts: Vec3[] = [];
  const sphereEdges: Edge[] = [];
  const ringR = 1.0;
  const ringResolution = 8;
  const addRing = (ax: 'x' | 'y' | 'z') => {
    const start = sphereVerts.length;
    for (let i = 0; i < ringResolution; i++) {
      const a = (i / ringResolution) * Math.PI * 2;
      if (ax === 'x') sphereVerts.push([0, Math.cos(a) * ringR, Math.sin(a) * ringR]);
      else if (ax === 'y') sphereVerts.push([Math.cos(a) * ringR, 0, Math.sin(a) * ringR]);
      else sphereVerts.push([Math.cos(a) * ringR, Math.sin(a) * ringR, 0]);
    }
    for (let i = 0; i < ringResolution; i++) {
      sphereEdges.push([start + i, start + ((i + 1) % ringResolution)]);
    }
  };
  addRing('x'); addRing('y'); addRing('z');
  return {
    ground: null,
    dimObjects: [
      { mesh: { vertices: sphereVerts, edges: sphereEdges }, position: [0, 0, 0], scale: 1, spinSpeed: 0.15, bobAmplitude: 0, bobFreq: 0 },
    ],
    heroObjects: [
      { mesh: octahedron(0.45), position: [-0.3, 0.0, 0],  scale: 1, spinSpeed: 1.4,  bobAmplitude: 0.04, bobFreq: 0.9 },
      { mesh: octahedron(0.45), position: [ 0.3, 0.0, 0],  scale: 1, spinSpeed: -1.4, bobAmplitude: 0.04, bobFreq: 1.1 },
    ],
    orbitSpeed: 0.4,
    pitch: 0.1,
    cameraDistance: 4.5,
  };
})();

/** Ch.7 Logic — gate matrix; a 3×3 grid of small boxes connected by lines. */
const SCENE_LOGIC: Scene = (() => {
  const heroObjects: SceneObject[] = [];
  const wireVerts: Vec3[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const p: Vec3 = [col * 0.85, row * 0.6, 0];
      heroObjects.push({
        mesh: box(0.36, 0.36, 0.36),
        position: p,
        scale: 1,
        spinSpeed: 0,
        bobAmplitude: 0.02,
        bobFreq: 0.4 + Math.abs(row + col) * 0.1,
      });
      wireVerts.push(p);
    }
  }
  // Connect adjacent gates horizontally + vertically.
  const wireEdges: Edge[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (col < 2) wireEdges.push([idx, idx + 1]);
      if (row < 2) wireEdges.push([idx, idx + 3]);
    }
  }
  return {
    ground: { cells: 6, halfExtent: 1.6, y: -0.9 },
    dimObjects: [
      { mesh: { vertices: wireVerts, edges: wireEdges }, position: [0, 0, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0, bobFreq: 0 },
    ],
    heroObjects,
    orbitSpeed: 0.28,
    pitch: 0.38,
    cameraDistance: 4.4,
  };
})();

/** Ch.8 Void — single tall obelisk + dotted halo. */
const SCENE_VOID: Scene = {
  ground: null,
  dimObjects: [
    // Halo of dots.
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2;
      return {
        mesh: dot(),
        position: [Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25] as Vec3,
        scale: 1,
        spinSpeed: 0,
        bobAmplitude: 0.04,
        bobFreq: 0.5 + i * 0.05,
      };
    }),
  ],
  heroObjects: [
    // Tall narrow obelisk — long pyramid + base box.
    { mesh: box(0.5, 0.2, 0.5), position: [0, -0.7, 0], scale: 1, spinSpeed: 0, bobAmplitude: 0.02, bobFreq: 0.4 },
    { mesh: pyramid(0.32, 1.6), position: [0, -0.6, 0], scale: 1, spinSpeed: 0.2, bobAmplitude: 0.03, bobFreq: 0.4 },
  ],
  orbitSpeed: 0.18,
  pitch: 0.2,
  cameraDistance: 4.6,
};

/** Ch.9 Apex — central crowned hex prism, surrounded by orbiting smaller hexes. */
const SCENE_APEX: Scene = (() => {
  const heroObjects: SceneObject[] = [
    { mesh: hexPrism(0.85, 1.1), position: [0, 0, 0], scale: 1, spinSpeed: 0.4, bobAmplitude: 0.04, bobFreq: 0.4 },
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    heroObjects.push({
      mesh: hexPrism(0.18, 0.4),
      position: [Math.cos(a) * 1.4, 0.4, Math.sin(a) * 1.4],
      scale: 1,
      spinSpeed: 0.9,
      bobAmplitude: 0.07,
      bobFreq: 0.6 + i * 0.08,
    });
  }
  return {
    ground: { cells: 8, halfExtent: 1.9, y: -0.85 },
    dimObjects: [
      // Vertical crown spike.
      { mesh: pyramid(0.25, 1.4), position: [0, 0.55, 0], scale: 1, spinSpeed: 0.2, bobAmplitude: 0.02, bobFreq: 0.5 },
    ],
    heroObjects,
    orbitSpeed: 0.32,
    pitch: 0.42,
    cameraDistance: 5.0,
  };
})();

const SCENES: Readonly<Record<number, Scene>> = {
  0: SCENE_INTRANET,
  1: SCENE_UPLINK,
  2: SCENE_CLOUD,
  3: SCENE_MAINFRAME,
  4: SCENE_FIRMWARE,
  5: SCENE_DARKNET,
  6: SCENE_QUANTUM,
  7: SCENE_LOGIC,
  8: SCENE_VOID,
  9: SCENE_APEX,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChapterHero3D({
  chapterIndex,
  accent,
  size = 220,
}: {
  chapterIndex: number;
  /** Hex color used for stroke + glow tint. */
  accent: string;
  /** Square render size in pixels. */
  size?: number;
}) {
  const scene = SCENES[chapterIndex] ?? SCENE_INTRANET;

  // Flatten the scene into worklet-friendly typed buffers. Reanimated worklets
  // can read from captured plain arrays without serialization cost.
  const flat = useMemo(() => flattenScene(scene), [scene]);

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    time.value = info.timestamp / 1000;
  }, true);

  const groundPath = useDerivedValue<SkPath>(() => {
    'worklet';
    const t = time.value;
    const cam = cameraParams(t, flat.orbitSpeed, flat.pitch, flat.cameraDistance, size);
    const skp = Skia.Path.Make();

    // Ground grid: lines parallel to X (varying Z) and lines parallel to Z (varying X).
    if (flat.groundCells > 0) {
      const cells = flat.groundCells;
      const half = flat.groundHalfExtent;
      const y = flat.groundY;
      const step = (half * 2) / cells;
      for (let i = 0; i <= cells; i++) {
        const v = -half + i * step;
        const a = projectWorld(-half, y, v, cam);
        const b = projectWorld( half, y, v, cam);
        skp.moveTo(a.x, a.y); skp.lineTo(b.x, b.y);
        const c = projectWorld(v, y, -half, cam);
        const d = projectWorld(v, y,  half, cam);
        skp.moveTo(c.x, c.y); skp.lineTo(d.x, d.y);
      }
    }

    // Dim object edges.
    drawObjects(skp, flat.dim, t, cam);
    return skp;
  });

  const accentPath = useDerivedValue<SkPath>(() => {
    'worklet';
    const t = time.value;
    const cam = cameraParams(t, flat.orbitSpeed, flat.pitch, flat.cameraDistance, size);
    const skp = Skia.Path.Make();
    drawObjects(skp, flat.hero, t, cam);
    return skp;
  });

  const accentGlow = `${accent}55`;
  const accentDim = `${accent}55`;

  return (
    <View style={[styles.root, { width: size, height: size }]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        {/* Ground + dim props drawn at low alpha. */}
        <Path path={groundPath} style="stroke" strokeWidth={1} color={accentDim}
              strokeCap="round" strokeJoin="round" />
        {/* Hero glow. */}
        <Path path={accentPath} style="stroke" strokeWidth={4} color={accentGlow}
              strokeCap="round" strokeJoin="round" />
        {/* Hero crisp line. */}
        <Path path={accentPath} style="stroke" strokeWidth={1.5} color={accent}
              strokeCap="round" strokeJoin="round" />
      </Canvas>
    </View>
  );
}

// ─── Worklet-side helpers ────────────────────────────────────────────────────

type FlatScene = {
  groundCells: number;
  groundHalfExtent: number;
  groundY: number;
  /** Flattened object data. Indexed by object index. */
  dim: FlatObjects;
  hero: FlatObjects;
  orbitSpeed: number;
  pitch: number;
  cameraDistance: number;
};

type FlatObjects = {
  /** Per-object: [px, py, pz, scale, spinSpeed, bobAmp, bobFreq, vertexStart, edgeStart, edgeCount]. */
  meta: number[];
  /** Flat vertex buffer (3 floats per vertex). */
  verts: number[];
  /** Flat edge buffer (2 ints per edge). */
  edges: number[];
};

function flattenScene(scene: Scene): FlatScene {
  return {
    groundCells: scene.ground?.cells ?? 0,
    groundHalfExtent: scene.ground?.halfExtent ?? 0,
    groundY: scene.ground?.y ?? 0,
    dim: flattenObjects(scene.dimObjects),
    hero: flattenObjects(scene.heroObjects),
    orbitSpeed: scene.orbitSpeed,
    pitch: scene.pitch,
    cameraDistance: scene.cameraDistance,
  };
}

function flattenObjects(objs: ReadonlyArray<SceneObject>): FlatObjects {
  const meta: number[] = [];
  const verts: number[] = [];
  const edges: number[] = [];
  for (const o of objs) {
    const vStart = verts.length / 3;
    for (const v of o.mesh.vertices) {
      verts.push(v[0], v[1], v[2]);
    }
    const eStart = edges.length / 2;
    for (const e of o.mesh.edges) {
      edges.push(e[0], e[1]);
    }
    const eCount = o.mesh.edges.length;
    meta.push(
      o.position[0], o.position[1], o.position[2],
      o.scale, o.spinSpeed, o.bobAmplitude, o.bobFreq,
      vStart, eStart, eCount,
    );
  }
  return { meta, verts, edges };
}

type Cam = {
  cosY: number; sinY: number;
  cosP: number; sinP: number;
  dist: number;
  focal: number;
  cx: number; cy: number;
};

function cameraParams(
  t: number, orbitSpeed: number, pitch: number, dist: number, size: number,
): Cam {
  'worklet';
  const yaw = t * orbitSpeed;
  const focal = size * 0.42;
  return {
    cosY: Math.cos(yaw),
    sinY: Math.sin(yaw),
    cosP: Math.cos(pitch),
    sinP: Math.sin(pitch),
    dist,
    focal,
    cx: size / 2,
    cy: size / 2,
  };
}

function projectWorld(wx: number, wy: number, wz: number, cam: Cam): { x: number; y: number } {
  'worklet';
  // World rotated by -yaw around Y (world spins under a camera fixed at +Z).
  const rx = wx * cam.cosY - wz * cam.sinY;
  const rz = wx * cam.sinY + wz * cam.cosY;
  // Pitch around X (camera tilt down → world tilts up relative to camera).
  const ry2 = wy * cam.cosP - rz * cam.sinP;
  const rz2 = wy * cam.sinP + rz * cam.cosP;
  // Push behind the camera by `dist` so all geometry has positive depth.
  const camZ = cam.dist + rz2;
  const safeZ = camZ > 0.05 ? camZ : 0.05;
  return {
    x: (rx * cam.focal) / safeZ + cam.cx,
    y: (ry2 * cam.focal) / safeZ + cam.cy,
  };
}

function drawObjects(skp: SkPath, objs: FlatObjects, t: number, cam: Cam): void {
  'worklet';
  const meta = objs.meta;
  const verts = objs.verts;
  const edges = objs.edges;
  const stride = 10;
  const objCount = meta.length / stride;
  for (let i = 0; i < objCount; i++) {
    const base = i * stride;
    const px = meta[base]!;
    const py = meta[base + 1]!;
    const pz = meta[base + 2]!;
    const scale = meta[base + 3]!;
    const spin = meta[base + 4]!;
    const bobAmp = meta[base + 5]!;
    const bobFreq = meta[base + 6]!;
    const vStart = meta[base + 7]!;
    const eStart = meta[base + 8]!;
    const eCount = meta[base + 9]!;

    const localYaw = t * spin;
    const cosL = Math.cos(localYaw), sinL = Math.sin(localYaw);
    const yBob = bobAmp === 0 ? 0 : Math.sin(t * bobFreq * 2 * Math.PI) * bobAmp;

    for (let e = 0; e < eCount; e++) {
      const ei = (eStart + e) * 2;
      const aIdx = edges[ei]!;
      const bIdx = edges[ei + 1]!;
      const aOff = (vStart + aIdx) * 3;
      const bOff = (vStart + bIdx) * 3;

      // Vertex A.
      let vax = verts[aOff]!;
      const vay = verts[aOff + 1]!;
      let vaz = verts[aOff + 2]!;
      // Local Y spin.
      const lax = vax * cosL + vaz * sinL;
      const laz = -vax * sinL + vaz * cosL;
      vax = lax; vaz = laz;
      // Scale + translate.
      const wax = vax * scale + px;
      const way = vay * scale + py + yBob;
      const waz = vaz * scale + pz;

      // Vertex B.
      let vbx = verts[bOff]!;
      const vby = verts[bOff + 1]!;
      let vbz = verts[bOff + 2]!;
      const lbx = vbx * cosL + vbz * sinL;
      const lbz = -vbx * sinL + vbz * cosL;
      vbx = lbx; vbz = lbz;
      const wbx = vbx * scale + px;
      const wby = vby * scale + py + yBob;
      const wbz = vbz * scale + pz;

      const pa = projectWorld(wax, way, waz, cam);
      const pb = projectWorld(wbx, wby, wbz, cam);
      skp.moveTo(pa.x, pa.y);
      skp.lineTo(pb.x, pb.y);
    }
  }
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

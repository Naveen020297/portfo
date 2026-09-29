"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { READY_EVENT, STATION_COUNT, STATION_SPACING, store, type Tier } from "@/lib/store";
import { SCENE, useTheme } from "@/lib/theme";
import CameraRig from "./CameraRig";
import { Effects, Sparks, StudioEnv } from "./fx";
import { Anchor } from "./parts";
import { BackendStation, BuildStation, ContactStation, HeroCore, InfraStation, OfferStation, ProcessStation, StackStation } from "./stations";

const STAR_COUNT: Record<Tier, number> = { 0: 1200, 1: 4000, 2: 9000 };
const DEPTH = STATION_SPACING * (STATION_COUNT - 1);
const ACCENTS = ["#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#8b5cf6", "#22d3ee"];

/* ───────────── sky: a gradient dome with a soft accent wash behind the current station ───────────── */
const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; uniform vec3 uAccent; uniform float uMix; uniform float uLight;
uniform vec3 uAurA; uniform vec3 uAurB;
varying vec3 vDir;
void main(){
  float y = vDir.y;
  vec3 c = y > 0.0 ? mix(uHor, uTop, smoothstep(0.0, 0.55, y)) : mix(uHor, uBot, smoothstep(0.0, -0.45, y));
  // A broad glow behind the station, like a coloured backdrop light.
  float g = exp(-pow(distance(vDir, normalize(vec3(0.25, 0.12, -1.0))) * 2.4, 2.0));
  c = mix(c, mix(c, uAccent, uMix), g);
  // Light theme: a soft cyan-to-lavender aurora across the upper sky, fading into a white horizon.
  float aur = smoothstep(0.02, 0.5, y) * (0.75 + 0.25 * sin(vDir.x * 3.0 + vDir.z * 2.0));
  vec3 aurora = mix(uAurA, uAurB, smoothstep(-0.7, 0.7, vDir.x));
  c = mix(c, aurora, aur * uLight);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function Sky() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    const c = (h: string) => new THREE.Color(h);
    return new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uTop: { value: c("#000") }, uHor: { value: c("#000") }, uBot: { value: c("#000") }, uAccent: { value: c(ACCENTS[0]) }, uMix: { value: 0 }, uLight: { value: 0 }, uAurA: { value: c(SCENE.light.aurora[0]) }, uAurB: { value: c(SCENE.light.aurora[1]) } },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
  }, []);
  useEffect(() => () => mat.dispose(), [mat]);
  const cols = useMemo(() => {
    const c = (h: string) => new THREE.Color(h);
    return { d: SCENE.dark.sky.map(c), l: SCENE.light.sky.map(c), acc: ACCENTS.map(c), tmp: new THREE.Color() };
  }, []);

  useFrame(({ camera }, dt) => {
    const m = ref.current;
    if (!m) return;
    m.position.copy(camera.position);
    const k = store.light;
    const u = mat.uniforms;
    u.uTop.value.lerpColors(cols.d[0], cols.l[0], k);
    u.uHor.value.lerpColors(cols.d[1], cols.l[1], k);
    u.uBot.value.lerpColors(cols.d[2], cols.l[2], k);
    u.uMix.value = THREE.MathUtils.lerp(SCENE.dark.accentMix, SCENE.light.accentMix, k);
    u.uLight.value = k;
    // Glide toward the active station's colour rather than snapping.
    const target = cols.acc[Math.min(ACCENTS.length - 1, store.active)];
    const a = u.uAccent.value as THREE.Color;
    a.lerp(target, 1 - Math.exp(-dt * 1.5));
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[50, 32, 16]} />
    </mesh>
  );
}

/* ───────────── stars: soft round sprites with their own size, colour temperature and twinkle.
 * On the light theme they turn into drifting dust motes (bigger, fainter, ink-coloured). ───────────── */
const STAR_VERT = /* glsl */ `
uniform float uTime; uniform float uPix; uniform float uBoost; uniform float uLight;
attribute float aSize; attribute float aSeed; attribute vec3 aTint;
varying vec3 vCol; varying float vA;
void main(){
  vec3 p = position;
  // Motes drift a little in light mode.
  p.x += uLight * sin(uTime * 0.2 + aSeed * 40.0) * 0.4;
  p.y += uLight * sin(uTime * 0.17 + aSeed * 70.0) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 0.6 + 0.4 * sin(uTime * (0.4 + aSeed * 2.2) + aSeed * 60.0);
  float z = -mv.z;
  gl_PointSize = min(aSize * uPix * (1.0 + uBoost) * mix(1.0, 1.5, uLight) / z, 20.0);
  vCol = aTint;
  vA = tw * smoothstep(0.6, 3.0, z);
  gl_Position = projectionMatrix * mv;
}`;
const STAR_FRAG = /* glsl */ `
uniform vec3 uInk; uniform float uLight;
varying vec3 vCol; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = mix(a * a, a * 0.6, uLight) * vA;
  gl_FragColor = vec4(mix(vCol, uInk, uLight), a * mix(1.0, 0.1, uLight));
}`;

/* Warp streaks: a line per star whose tail stretches back along the flight path at speed. */
const STREAK_VERT = /* glsl */ `
uniform float uVel;
attribute float aEnd;
varying float vFade;
void main(){
  vec3 p = position;
  p.z -= aEnd * uVel * 7.0;
  vFade = 1.0 - aEnd;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const STREAK_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uAlpha;
varying float vFade;
void main(){ gl_FragColor = vec4(uCol, vFade * uAlpha); }`;

const TINTS = [
  [0.78, 0.88, 1.0], // blue-white
  [1.0, 1.0, 1.0],
  [1.0, 0.9, 0.76], // warm
  [0.55, 0.95, 1.0], // cyan cast
  [0.8, 0.7, 1.0], // violet cast
];

function Starfield({ tier }: { tier: Tier }) {
  const light = useTheme() === "light";
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geo, streakGeo } = useMemo(() => {
    const n = STAR_COUNT[tier];
    const pos = new Float32Array(n * 3);
    const sz = new Float32Array(n);
    const seed = new Float32Array(n);
    const tint = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 2] = 14 - Math.random() * (DEPTH + 40);
      sz[i] = 0.05 + Math.random() ** 5 * 0.22;
      seed[i] = Math.random();
      // A few bright stars get pushed past 1.0 so bloom catches them.
      const t = TINTS[Math.random() < 0.7 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)];
      const k = 0.55 + Math.random() ** 3 * 1.1;
      tint.set([t[0] * k, t[1] * k, t[2] * k], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));

    // Every third star also gets a streak: two vertices, head (aEnd 0) and tail (aEnd 1).
    const m = Math.floor(n / 3);
    const sp = new Float32Array(m * 6);
    const end = new Float32Array(m * 2);
    for (let i = 0; i < m; i++) {
      const o = i * 9;
      sp.set([pos[o], pos[o + 1], pos[o + 2], pos[o], pos[o + 1], pos[o + 2]], i * 6);
      end[i * 2 + 1] = 1;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    return { geo: g, streakGeo: sg };
  }, [tier]);
  useEffect(
    () => () => {
      geo.dispose();
      streakGeo.dispose();
    },
    [geo, streakGeo],
  );

  const { stars, streaks } = useMemo(
    () => ({
      stars: new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: { uTime: { value: 0 }, uPix: { value: 400 }, uBoost: { value: 0 }, uInk: { value: new THREE.Color("#5b6b82") }, uLight: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
      streaks: new THREE.ShaderMaterial({
        vertexShader: STREAK_VERT,
        fragmentShader: STREAK_FRAG,
        uniforms: { uVel: { value: 0 }, uCol: { value: new THREE.Color() }, uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      stars.dispose();
      streaks.dispose();
    },
    [stars, streaks],
  );
  // Light on dark adds up; dark on light has to be painted over.
  stars.blending = streaks.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;

  const lines = useRef<THREE.LineSegments>(null);
  useFrame(({ clock }) => {
    const v = store.vel;
    stars.uniforms.uTime.value = clock.elapsedTime;
    stars.uniforms.uPix.value = size.height * 0.5 * dpr;
    stars.uniforms.uBoost.value = Math.abs(v) * 1.2 + store.pulse * 1.5;
    stars.uniforms.uLight.value = store.light;
    streaks.uniforms.uVel.value = v;
    streaks.uniforms.uAlpha.value = Math.min(1, Math.max(0, Math.abs(v) - 0.06) * 2.2) * (light ? 0.35 : 0.9);
    streaks.uniforms.uCol.value.set(light ? "#475569" : "#bfefff");
    if (lines.current) lines.current.visible = Math.abs(v) > 0.06;
  });

  return (
    <>
      <points geometry={geo} material={stars} frustumCulled={false} />
      <lineSegments ref={lines} geometry={streakGeo} material={streaks} frustumCulled={false} visible={false} />
    </>
  );
}

/* ───────────── floor: a low-contrast grid that follows the flight path ───────────── */
const FLOOR_Y = -3.2;

function Floor() {
  const ref = useRef<THREE.Group>(null);
  const grid = useRef<THREE.Mesh>(null);
  const c = useMemo(
    () => ({ cell: [new THREE.Color(SCENE.dark.cell), new THREE.Color(SCENE.light.cell)], section: [new THREE.Color(SCENE.dark.section), new THREE.Color(SCENE.light.section)] }),
    [],
  );
  useFrame(() => {
    if (ref.current) ref.current.position.z = -store.smooth * DEPTH;
    // Blend line colours with the theme tween rather than snapping on switch.
    const u = (grid.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (u) {
      u.cellColor.value.lerpColors(c.cell[0], c.cell[1], store.light);
      u.sectionColor.value.lerpColors(c.section[0], c.section[1], store.light);
      // Light theme: the grid runs all the way to the horizon so the pale floor never looks empty.
      const k = store.light;
      u.fadeDistance.value = THREE.MathUtils.lerp(40, 95, k);
      u.fadeStrength.value = THREE.MathUtils.lerp(2.2, 1.15, k);
      u.cellThickness.value = THREE.MathUtils.lerp(0.5, 0.7, k);
      u.sectionThickness.value = THREE.MathUtils.lerp(0.9, 1.05, k);
    }
  });
  return (
    <group ref={ref} position={[0, FLOOR_Y, 0]}>
      <Grid ref={grid} args={[200, 200]} cellSize={1} cellThickness={0.5} cellColor={SCENE.dark.cell} sectionSize={8} sectionThickness={0.9} sectionColor={SCENE.dark.section} fadeDistance={40} fadeStrength={2.2} infiniteGrid />
    </group>
  );
}

/* ───────────── lighting: key light plus theme-blended ambient and sky fill ───────────── */
function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  useFrame(() => {
    const k = store.light;
    if (sun.current) sun.current.intensity = THREE.MathUtils.lerp(SCENE.dark.sun, SCENE.light.sun, k);
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(SCENE.dark.ambient, SCENE.light.ambient, k);
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(SCENE.dark.hemi, SCENE.light.hemi, k);
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={SCENE.dark.ambient} />
      <hemisphereLight ref={hemi} args={["#eef4ff", "#b9c1cc", 0]} />
      <directionalLight ref={sun} position={[4, 6, 8]} intensity={SCENE.dark.sun} />
    </>
  );
}

/** Blends sky and fog colours as store.light tweens. */
function ThemeSync() {
  const scene = useThree((s) => s.scene);
  const c = useMemo(() => ({ bg: [new THREE.Color(SCENE.dark.bg), new THREE.Color(SCENE.light.bg)], fog: [new THREE.Color(SCENE.dark.fog), new THREE.Color(SCENE.light.fog)] }), []);
  useFrame(() => {
    const k = store.light;
    if (scene.background instanceof THREE.Color) scene.background.lerpColors(c.bg[0], c.bg[1], k);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.lerpColors(c.fog[0], c.fog[1], k);
      fog.near = THREE.MathUtils.lerp(14, 22, k);
      fog.far = THREE.MathUtils.lerp(48, 70, k);
    }
  });
  return null;
}

/** FPS probe + one-shot "ready" signal for the loader. */
function Probe() {
  const frames = useRef(0);
  useFrame((_, dt) => {
    if (dt > 0) store.fps = store.fps * 0.94 + (1 / dt) * 0.06;
    if (++frames.current === 3) {
      store.ready = true;
      window.dispatchEvent(new Event(READY_EVENT));
    }
    // Boot sequence: armour assembles over ~2.4s once the first frames are on screen.
    if (frames.current > 3) store.intro = Math.min(1, store.intro + dt / 2.4);
  });
  useEffect(() => {
    frames.current = 0;
  }, []);
  return null;
}

export default function Scene({ tier }: { tier: Tier }) {
  store.tier = tier;
  return (
    <>
      <color attach="background" args={[SCENE.dark.bg]} />
      <fog attach="fog" args={[SCENE.dark.fog, 14, 48]} />
      <ThemeSync />
      <Sky />
      <Lights />
      <StudioEnv />
      <Sparks />
      <CameraRig />
      <Probe />
      <Starfield tier={tier} />
      <Floor />

      <Anchor index={0} accent={ACCENTS[0]}>
        <HeroCore tier={tier} />
      </Anchor>
      <Anchor index={1} accent={ACCENTS[1]}>
        <BuildStation tier={tier} />
      </Anchor>
      <Anchor index={2} accent={ACCENTS[2]}>
        <BackendStation tier={tier} />
      </Anchor>
      <Anchor index={3} accent={ACCENTS[3]}>
        <InfraStation tier={tier} />
      </Anchor>
      <Anchor index={4} accent={ACCENTS[4]}>
        <OfferStation tier={tier} />
      </Anchor>
      <Anchor index={5} accent={ACCENTS[5]}>
        <ProcessStation tier={tier} />
      </Anchor>
      <Anchor index={6} accent={ACCENTS[6]}>
        <StackStation tier={tier} />
      </Anchor>
      <Anchor index={7} accent={ACCENTS[7]}>
        <ContactStation tier={tier} />
      </Anchor>

      <Effects tier={tier} />
    </>
  );
}

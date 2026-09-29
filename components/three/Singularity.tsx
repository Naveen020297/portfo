"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { build, rel, store, type Tier } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { backOut } from "./fx";

/* Ashima 3D simplex noise (MIT) */
const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* ── core: a near-black horizon with slow turbulence and a thin burning rim (no metal, no facets) ── */
const CORE_VERT = /* glsl */ `
uniform float uTime; uniform float uAmp;
varying vec3 vN; varying vec3 vV; varying float vNoise;
${SNOISE}
void main(){
  float n = snoise(normal * 1.4 + vec3(uTime * 0.22)) + 0.4 * snoise(normal * 4.0 - vec3(uTime * 0.5));
  vNoise = n;
  vec3 p = position + normal * n * uAmp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;
const CORE_FRAG = /* glsl */ `
uniform float uTime; uniform float uGlow; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
uniform float uLight; uniform vec3 uPearl; uniform vec3 uIrA; uniform vec3 uIrB; uniform vec3 uIrC;
varying vec3 vN; varying vec3 vV; varying float vNoise;
void main(){
  float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
  float fres = pow(smoothstep(0.45, 1.0, f), 2.0);                // glow only at the limb
  float bands = sin(vNoise * 5.0 + uTime * 1.2) * 0.5 + 0.5;
  vec3 col = uA * (0.01 + 0.06 * bands * bands) * (1.0 - fres);  // black heart, barely-there swirls
  col += mix(uB, uC, smoothstep(0.3, 1.0, bands)) * fres * 2.4 * uGlow; // burning event-horizon rim
  col += uB * pow(max(vNoise, 0.0), 5.0) * 0.45 * uGlow * fres;  // filaments only at the limb

  // Light theme: an iridescent pearl instead of a black hole painted onto white.
  float h = fract(vNoise * 0.3 + f * 0.8 + uTime * 0.03);
  vec3 sheen = h < 0.333 ? mix(uIrA, uIrB, h * 3.0) : h < 0.666 ? mix(uIrB, uIrC, (h - 0.333) * 3.0) : mix(uIrC, uIrA, (h - 0.666) * 3.0);
  vec3 pearl = mix(uPearl, sheen, 0.22 + 0.5 * smoothstep(0.2, 1.0, f));  // pale centre, colour gathers toward the edge
  pearl += sheen * pow(f, 3.0) * 0.35 * uGlow;                          // soft luminous limb
  pearl *= 0.92 + 0.08 * (1.0 - f);                                     // a touch of depth
  col = mix(col, pearl, uLight);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ── halo: soft back-lit atmosphere ── */
const HALO_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uGlow;
varying vec3 vN; varying vec3 vV;
void main(){
  float d = max(dot(normalize(vN), normalize(vV)), 0.0);
  float a = pow(d, 3.0) * uGlow;
  gl_FragColor = vec4(uCol * a, 1.0);
}`;
const HALO_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

/* ── accretion disk: particles that orbit (faster near the centre) and spiral inward ── */
const DISK_VERT = /* glsl */ `
uniform float uSpin; uniform float uFall; uniform float uPix; uniform float uGlow; uniform float uLight;
attribute float aLife; attribute float aAng; attribute float aH; attribute float aSize;
varying vec3 vCol; varying float vA;
void main(){
  float life = fract(aLife - uFall);
  float r = 1.25 + 3.1 * pow(life, 1.35);
  float ang = aAng + uSpin * 2.4 / pow(r, 1.5);
  vec3 p = vec3(cos(ang) * r, aH * 0.06 * r, sin(ang) * r);
  float t = (r - 1.25) / 3.1;
  vec3 hot = vec3(1.4, 1.9, 2.4);
  vec3 cyan = vec3(0.13, 0.83, 0.93) * 1.6;
  vec3 violet = vec3(0.55, 0.36, 0.96) * 1.1;
  vec3 pink = vec3(0.96, 0.45, 0.71) * 0.8;
  vCol = t < 0.15 ? mix(hot, cyan, t / 0.15) : t < 0.55 ? mix(cyan, violet, (t - 0.15) / 0.4) : mix(violet, pink, (t - 0.55) / 0.45);
  // Relativistic beaming: matter orbiting toward the viewer is far brighter than the receding side.
  float beam = 0.35 + 1.3 * pow(0.5 + 0.5 * sin(ang), 2.0);
  vCol *= uGlow * 0.38 * beam;
  // Painted (not additive) on the light theme: deep saturated tones that read on a pale sky.
  vec3 hotL = vec3(0.45, 0.85, 1.0);
  vec3 cyanL = vec3(0.0, 0.55, 0.75);
  vec3 violetL = vec3(0.4, 0.2, 0.85);
  vec3 pinkL = vec3(0.8, 0.2, 0.5);
  vec3 colL = t < 0.15 ? mix(hotL, cyanL, t / 0.15) : t < 0.55 ? mix(cyanL, violetL, (t - 0.15) / 0.4) : mix(violetL, pinkL, (t - 0.55) / 0.45);
  vCol = mix(vCol, colL * clamp(beam * 0.7, 0.55, 1.1), uLight);
  vA = smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.8, 1.0, life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uPix * (1.0 + (1.0 - t) * 1.4) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const DISK_FRAG = /* glsl */ `
varying vec3 vCol; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(vCol, a);
}`;

/* ── jets: two flickering beams along the spin axis ── */
const JET_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const JET_FRAG = /* glsl */ `
uniform float uTime; uniform float uPower; uniform vec3 uCol;
varying vec2 vUv;
void main(){
  float along = 1.0 - vUv.y;                            // 0 at the tip, 1 at the base
  float streak = 0.6 + 0.4 * sin(vUv.x * 40.0 + uTime * 3.0) * sin(along * 30.0 - uTime * 12.0);
  float a = pow(along, 2.5) * streak * uPower;
  gl_FragColor = vec4(uCol, min(a, 1.0));
}`;

const DISK_COUNT: Record<Tier, number> = { 0: 3500, 1: 10000, 2: 22000 };

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

export default function Singularity({ tier }: { tier: Tier }) {
  const light = useTheme() === "light";
  const dpr = useThree((s) => s.viewport.dpr);
  const system = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const spin = useRef(0);
  const fall = useRef(0);

  const core = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: 0.08 },
          uGlow: { value: 1 },
          uA: { value: new THREE.Color("#4c1d95") },
          uB: { value: new THREE.Color("#22d3ee") },
          uC: { value: new THREE.Color("#f472b6") },
          uLight: { value: 0 },
          uPearl: { value: new THREE.Color("#f5f3ff") },
          uIrA: { value: new THREE.Color("#67e8f9") },
          uIrB: { value: new THREE.Color("#a78bfa") },
          uIrC: { value: new THREE.Color("#f9a8d4") },
        },
      }),
    [],
  );
  const halo = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, side: THREE.BackSide, uniforms: { uCol: { value: new THREE.Color("#5b8cff") }, uGlow: { value: 1 } }, ...add }),
    [],
  );
  const disk = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: DISK_VERT, fragmentShader: DISK_FRAG, uniforms: { uSpin: { value: 0 }, uFall: { value: 0 }, uPix: { value: 30 }, uGlow: { value: 1 }, uLight: { value: 0 } }, ...add }),
    [],
  );
  const jet = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: JET_VERT,
        fragmentShader: JET_FRAG,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uPower: { value: 0.2 }, uCol: { value: new THREE.Color("#7dd3fc") } },
        ...add,
      }),
    [],
  );
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3e0").multiplyScalar(1.6), toneMapped: false, ...add }), []);
  useEffect(
    () => () => {
      [core, halo, disk, jet, ringMat].forEach((m) => m.dispose());
    },
    [core, halo, disk, jet, ringMat],
  );

  const geo = useMemo(() => {
    const n = DISK_COUNT[tier];
    const g = new THREE.BufferGeometry();
    const life = new Float32Array(n);
    const ang = new Float32Array(n);
    const h = new Float32Array(n);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      life[i] = Math.random();
      ang[i] = Math.random() * Math.PI * 2;
      h[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
      size[i] = 0.4 + Math.random() ** 3 * 1.8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
    g.setAttribute("aAng", new THREE.BufferAttribute(ang, 1));
    g.setAttribute("aH", new THREE.BufferAttribute(h, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
    return g;
  }, [tier]);
  useEffect(() => () => geo.dispose(), [geo]);

  // Additive glow vanishes on a pale sky, so the light theme paints these as ink instead.
  useEffect(() => {
    const mode = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    disk.blending = jet.blending = ringMat.blending = mode;
    jet.uniforms.uCol.value.set(light ? "#0e7490" : "#7dd3fc");
    ringMat.color.set(light ? "#8b5cf6" : "#fff3e0").multiplyScalar(light ? 1 : 1.6);
    ringMat.opacity = light ? 0.45 : 1;
  }, [light, disk, jet, ringMat]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const v = Math.abs(store.vel);
    const b = build(0);
    // Ignition: collapses in from nothing with a slight overshoot.
    const e = b >= 1 ? 1 : Math.max(0.001, backOut(b, 1.2));
    if (system.current) system.current.scale.setScalar(e);
    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, 0.32 - store.mouse.y * 0.35 + rel(0) * 0.4, 3, dt);
      tilt.current.rotation.z = THREE.MathUtils.damp(tilt.current.rotation.z, -0.18 + store.mouse.x * 0.3, 3, dt);
    }
    // G-force: scroll speed spins the disk up, drags matter in faster, fires the jets.
    spin.current += dt * (0.5 + v * 5 + store.pulse * 3);
    fall.current += dt * (0.02 + v * 0.18);
    disk.uniforms.uSpin.value = spin.current;
    disk.uniforms.uFall.value = fall.current;
    disk.uniforms.uPix.value = 22 * dpr;
    disk.uniforms.uGlow.value = 0.9 + v * 0.8 + store.pulse;
    disk.uniforms.uLight.value = store.light;
    core.uniforms.uTime.value = t * (1 + v * 3);
    // Smoother surface on the light theme: the pearl should look polished, not molten.
    core.uniforms.uAmp.value = THREE.MathUtils.lerp(0.07, 0.02, store.light) + v * 0.22 + store.pulse * 0.15;
    core.uniforms.uLight.value = store.light;
    core.uniforms.uGlow.value = 1 + v * 1.2 + store.pulse;
    halo.uniforms.uGlow.value = 0.55 + v * 0.8;
    jet.uniforms.uTime.value = t;
    jet.uniforms.uPower.value = 0.12 + v * 1.6 + store.pulse * 1.2;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.01 + v * 0.06);
  });

  const seg = tier === 0 ? 48 : tier === 1 ? 96 : 160;
  return (
    <group ref={system}>
      <group ref={tilt}>
        <mesh material={core}>
          <sphereGeometry args={[1, seg, seg / 2]} />
        </mesh>
        <mesh material={halo} scale={1.55} visible={!light}>
          <sphereGeometry args={[1, 48, 24]} />
        </mesh>
        <points geometry={geo} material={disk} frustumCulled={false} />
        {[1, -1].map((s) => (
          <mesh key={s} material={jet} position={[0, s * 2.1, 0]} rotation={[s > 0 ? 0 : Math.PI, 0, 0]} visible={!light}>
            <coneGeometry args={[0.32, 3.4, 32, 1, true]} />
          </mesh>
        ))}
      </group>
      {/* Lensed photon ring: always faces the viewer, like light bent around the horizon. */}
      <mesh ref={ring} material={ringMat}>
        <torusGeometry args={[1.16, 0.006, 8, 200]} />
      </mesh>
    </group>
  );
}

export const STATIONS = [
  { id: "hero", code: "00", label: "Ignition" },
  { id: "build", code: "01", label: "Frontend & Mobile" },
  { id: "backend", code: "02", label: "Backend Systems" },
  { id: "infra", code: "03", label: "Data & Infra" },
  { id: "offer", code: "04", label: "Offerings" },
  { id: "process", code: "05", label: "How We Work" },
  { id: "stack", code: "06", label: "Toolbelt" },
  { id: "contact", code: "07", label: "Contact" },
] as const;

/** Rotating line under the hero headline. */
export const SHIP = ["React Native apps", "multi-tenant SaaS platforms", "realtime backend systems", "observable infrastructure", "admin portals & dashboards"] as const;

export const OFFERINGS = [
  {
    title: "Mobile App Development",
    body: "Cross-platform iOS and Android apps with React Native: offline sync, native bridging, app store readiness.",
    tag: "React Native",
    color: "#22d3ee",
    tone: "cyan", // CSS token, darker in light mode
  },
  {
    title: "Full-Stack Web Systems",
    body: "Scalable web apps, admin portals and custom SaaS dashboards on modern React, Angular or Next.js.",
    tag: "Next.js · Angular",
    color: "#8b5cf6",
    tone: "violet", // CSS token, darker in light mode
  },
  {
    title: "Backend & System Architecture",
    body: "Monolith-to-modules migrations, multi-tenant database design and RBAC security layers.",
    tag: "Multi-tenant · RBAC",
    color: "#34d399",
    tone: "green", // CSS token, darker in light mode
  },
  {
    title: "DevOps, Cloud & Monitoring",
    body: "Load balancers, automated deployment pipelines and Datadog monitoring, wired up end to end.",
    tag: "L4/L7 · Datadog",
    color: "#fbbf24",
    tone: "amber", // CSS token, darker in light mode
  },
] as const;

/** 05 · How we work. Hovering a step in the text drives the robot to it in 3D. */
export const PROCESS = [
  {
    n: "01",
    title: "Discover",
    body: "A short scoping sprint: who uses it, what it must integrate with, and which unknowns could sink the plan. You leave with a written brief and an honest estimate.",
    out: "Brief · estimate · risk list",
    color: "#22d3ee",
    tone: "cyan",
  },
  {
    n: "02",
    title: "Architect",
    body: "Data model, tenancy, auth boundaries and deployment shape are decided before the first screen is built, so nothing gets rebuilt in month three.",
    out: "Architecture doc · schema · API contract",
    color: "#8b5cf6",
    tone: "violet",
  },
  {
    n: "03",
    title: "Build",
    body: "A demo on a staging URL every week, CI on every push, and code reviewed to a standard you could hire against.",
    out: "Staging builds · CI · reviewed pull requests",
    color: "#34d399",
    tone: "green",
  },
  {
    n: "04",
    title: "Operate",
    body: "Launch with dashboards, alerts and runbooks already in place. We stay on for hardening, then hand over cleanly or keep the pager.",
    out: "Dashboards · alerts · runbooks",
    color: "#fbbf24",
    tone: "amber",
  },
] as const;

export const ENGAGEMENT = [
  { title: "Fixed scope", body: "A defined brief, a fixed price and a delivery date." },
  { title: "Retainer", body: "Reserved monthly capacity for a product that keeps evolving." },
  { title: "Team extension", body: "Senior engineers embedded in your team, your process and your repo." },
] as const;

/** 06 · Toolbelt. Each group is one orbiting ring in 3D; hovering a group isolates its ring. */
export const STACK = [
  { title: "Frontend & Mobile", color: "#22d3ee", tone: "cyan", items: ["Next.js", "React", "Angular", "Vite", "React Native", "TypeScript"] },
  { title: "Backend & Data", color: "#8b5cf6", tone: "violet", items: ["Node.js", "WebSockets", "SSE", "MySQL", "MongoDB", "Redis"] },
  { title: "Cloud & Operations", color: "#fbbf24", tone: "amber", items: ["Nginx", "L4 / L7 balancing", "Docker", "CI/CD", "Datadog APM", "TLS"] },
] as const;

export const PROJECT_TYPES = ["Mobile app", "Web platform", "Backend / architecture", "DevOps & monitoring"] as const;

export const NEXT_STEPS = [
  { title: "Reply within a business day", body: "From a person, with questions." },
  { title: "A 30-minute scoping call", body: "Product, constraints, first release." },
  { title: "A written proposal", body: "Scope, timeline and price, in plain language." },
] as const;

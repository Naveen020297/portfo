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

export const NEXT_STEPS = [
  { title: "Reply within a business day", body: "From a person, with questions." },
  { title: "A 30-minute scoping call", body: "Product, constraints, first release." },
  { title: "A written proposal", body: "Scope, timeline and price, in plain language." },
] as const;

/* ───────────── studio site (lib/site.ts) ───────────── */

/** The lineup: one product card per service. `object` picks the 3D model, `color` tints it. */
export const LINEUP = [
  {
    id: "mobile",
    object: "phone",
    name: "Mobile App Development",
    headline: "One codebase. iOS and Android.",
    body: "Cross-platform apps with React Native: offline sync, native bridging and app store readiness.",
    features: [
      { title: "One UI codebase", body: "A single React Native app for iOS and Android." },
      { title: "Native device APIs", body: "State synchronisation, offline sync and native bridging." },
      { title: "Store ready", body: "Built and packaged for app store release." },
    ],
    stack: ["React Native", "TypeScript", "iOS", "Android"],
    color: "#0891b2",
    tone: "cyan",
  },
  {
    id: "web",
    object: "laptop",
    name: "Full-Stack Web Systems",
    headline: "Loads in under a second.",
    body: "Scalable web apps, admin portals and custom SaaS dashboards on modern React, Angular or Next.js.",
    features: [
      { title: "Web frameworks", body: "Production builds on Next.js, React, Angular and fast-bundling Vite apps." },
      { title: "Delivery standards", body: "Sub-second page loads, seamless navigation and modular component design." },
      { title: "Portals & dashboards", body: "Admin portals and SaaS dashboards built for daily use." },
    ],
    stack: ["Next.js", "React", "Angular", "Vite", "TypeScript"],
    color: "#7c3aed",
    tone: "violet",
  },
  {
    id: "backend",
    object: "server",
    name: "Backend & System Architecture",
    headline: "Every tenant isolated. Every action guarded.",
    body: "Architecture that isolates tenants, guards every action and pushes events in real time.",
    features: [
      { title: "Multi-tenant architecture", body: "Separate schemas vs shared pools, dynamic routing and tenant-context middleware." },
      { title: "Role-based access control", body: "Hierarchical permissions, role inheritance, granular scopes and secure sessions." },
      { title: "Notification engines", body: "WebSockets, Server-Sent Events and background push queues." },
      { title: "Migrations & batch workflows", body: "Scheduled workers, idempotent jobs and zero-downtime schema upgrades." },
    ],
    stack: ["Node.js", "WebSockets", "SSE", "RBAC", "Multi-tenant", "Queues & cron"],
    color: "#059669",
    tone: "green",
  },
  {
    id: "devops",
    object: "infra",
    name: "DevOps, Cloud & Monitoring",
    headline: "A clear view of production.",
    body: "Fast reads, safe writes, and load balancers, deployment pipelines and monitoring wired up end to end.",
    features: [
      { title: "Databases", body: "MySQL, MongoDB and Redis: indexing strategy, connection pooling and caching layers." },
      { title: "Traffic management", body: "Layer 4 and Layer 7 load balancers, reverse proxy routing and SSL termination." },
      { title: "Observability", body: "Structured log aggregation, alert dashboards and Datadog APM tracking." },
    ],
    stack: ["Nginx", "L4 / L7", "Docker", "CI/CD", "MySQL", "MongoDB", "Redis", "Datadog"],
    color: "#d97706",
    tone: "amber",
  },
] as const;

/** Engagement models side by side. Same facts as ENGAGEMENT, split into rows. */
export const COMPARE = [
  { title: "Fixed scope", best: "A project with a defined brief", get: "A fixed price and a delivery date" },
  { title: "Retainer", best: "A product that keeps evolving", get: "Reserved monthly capacity" },
  { title: "Team extension", best: "A team that needs more senior engineers", get: "Engineers embedded in your team, your process and your repo" },
] as const;

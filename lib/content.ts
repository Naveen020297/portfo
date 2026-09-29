export const STATIONS = [
  { id: "hero", code: "00", label: "Ignition" },
  { id: "build", code: "01", label: "Frontend & Mobile" },
  { id: "backend", code: "02", label: "Backend Systems" },
  { id: "infra", code: "03", label: "Data & Infra" },
  { id: "offer", code: "04", label: "Offerings" },
  { id: "contact", code: "05", label: "Contact" },
] as const;

export const OFFERINGS = [
  {
    title: "Mobile App Development",
    body: "Cross-platform iOS and Android apps with React Native: offline sync, native bridging, app store readiness.",
    tag: "React Native",
    color: "#22d3ee",
  },
  {
    title: "Full-Stack Web Systems",
    body: "Scalable web apps, admin portals and custom SaaS dashboards on modern React, Angular or Next.js.",
    tag: "Next.js · Angular",
    color: "#8b5cf6",
  },
  {
    title: "Backend & System Architecture",
    body: "Monolith-to-modules migrations, multi-tenant database design and RBAC security layers.",
    tag: "Multi-tenant · RBAC",
    color: "#34d399",
  },
  {
    title: "DevOps, Cloud & Monitoring",
    body: "Load balancers, automated deployment pipelines and Datadog monitoring, wired up end to end.",
    tag: "L4/L7 · Datadog",
    color: "#fbbf24",
  },
] as const;

export const PROJECT_TYPES = ["Mobile app", "Web platform", "Backend / architecture", "DevOps & monitoring"] as const;

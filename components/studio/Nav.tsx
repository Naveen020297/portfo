const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#engagement", label: "Engagement" },
] as const;

/** Slim frosted bar that stays on top; the 3D canvas sits beneath it. */
export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/50 bg-void/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5" aria-label="Main">
        <a href="#top" className="text-[17px] font-semibold tracking-tight text-fg">
          G-Force
        </a>
        <ul className="hidden items-center gap-8 text-xs text-body md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-fg">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#contact" className="rounded-full bg-link px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85">
          Start a project
        </a>
      </nav>
    </header>
  );
}

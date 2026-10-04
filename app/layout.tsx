import type { Metadata, Viewport } from "next";
import { SITE_THEME } from "@/lib/site";
import { THEME_BOOT } from "@/lib/themeBoot";
import "./globals.css";

const space = SITE_THEME === "space";

export const metadata: Metadata = {
  title: "G-Force — Full-Stack, Mobile & Systems Engineering",
  description:
    "An interactive 3D portfolio: React Native and web apps, multi-tenant backends, RBAC, realtime notifications, databases, load balancing and Datadog observability.",
};

export const viewport: Viewport = {
  themeColor: space
    ? [
        { media: "(prefers-color-scheme: dark)", color: "#05060a" },
        { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
      ]
    : "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by THEME_BOOT before hydration, hence the warning suppression.
    // The studio site is light only, so it skips the dark/light boot script.
    <html lang="en" data-site={SITE_THEME} suppressHydrationWarning>
      <head>{space && <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />}</head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

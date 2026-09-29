import type { Metadata, Viewport } from "next";
import { THEME_BOOT } from "@/lib/themeBoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "G-Force — Full-Stack, Mobile & Systems Engineering",
  description:
    "An interactive 3D portfolio: React Native and web apps, multi-tenant backends, RBAC, realtime notifications, databases, load balancing and Datadog observability.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05060a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by THEME_BOOT before hydration, hence the warning suppression.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

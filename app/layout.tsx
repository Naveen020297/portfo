import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "G-Force — Full-Stack, Mobile & Systems Engineering",
  description:
    "An interactive 3D portfolio: React Native and web apps, multi-tenant backends, RBAC, realtime notifications, databases, load balancing and Datadog observability.",
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

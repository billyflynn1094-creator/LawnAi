import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LawnAI — Smart Lawn Diagnostics",
  description:
    "Point your camera at any lawn issue and get instant AI-powered diagnosis, product recommendations, and application rates — tailored to your exact location.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LawnAI" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d1f0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-grass-gradient">{children}</body>
    </html>
  );
}

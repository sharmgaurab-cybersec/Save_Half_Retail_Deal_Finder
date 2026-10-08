import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveHalf — Retail Price Comparison",
  description: "Search tracked Australian products and compare dated real retailer price observations with SaveHalf.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

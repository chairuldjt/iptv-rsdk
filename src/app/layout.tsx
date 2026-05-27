import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://iptv.teknisirsdk.my.id"),
  title: {
    default: "RSDK IPTV Admin",
    template: "%s | RSDK IPTV Admin",
  },
  description: "Dashboard administrasi RSDK IPTV untuk manajemen playlist, channel, dan perangkat STB.",
  applicationName: "RSDK IPTV Admin",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/ic_global_iptv.png", type: "image/png", sizes: "32x32" },
      { url: "/ic_global_iptv.png", type: "image/png", sizes: "192x192" },
      { url: "/ic_global_iptv.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/ic_global_iptv.png", type: "image/png", sizes: "180x180" }],
    shortcut: [{ url: "/ic_global_iptv.png", type: "image/png" }],
  },
  openGraph: {
    title: "RSDK IPTV Admin",
    description: "Dashboard administrasi RSDK IPTV untuk manajemen playlist, channel, dan perangkat STB.",
    siteName: "RSDK IPTV Admin",
    images: [{ url: "/ic_global_iptv.png", width: 512, height: 512, alt: "RSDK IPTV Admin" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RSDK IPTV Admin",
    description: "Dashboard administrasi RSDK IPTV untuk manajemen playlist, channel, dan perangkat STB.",
    images: ["/ic_global_iptv.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

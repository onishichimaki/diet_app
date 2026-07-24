import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).href;

  return {
    metadataBase: new URL(origin),
    title: "Habi — 今日を、ちょっといい日に。",
    description: "食事・体重・運動・睡眠を、やさしく続けられる個人向け健康管理アプリ。",
    applicationName: "Habi",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Habi",
    },
    formatDetection: { telephone: false },
    openGraph: {
      title: "Habi — 今日を、ちょっといい日に。",
      description: "食事・体重・運動・睡眠を、やさしくひとつに。",
      type: "website",
      locale: "ja_JP",
      siteName: "Habi",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "Habi 健康管理アプリ" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Habi — 今日を、ちょっといい日に。",
      description: "食事・体重・運動・睡眠を、やさしくひとつに。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

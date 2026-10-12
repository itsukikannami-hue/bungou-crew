import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavigationVisibility from "@/components/NavigationVisibility";
import GlobalTimerNotice from "@/components/GlobalTimerNotice";
import PWARegister from "@/components/PWARegister";
import { ToastProvider } from "@/components/ToastProvider";
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
  title: "ブンゴウクルー",
  description: "物書きのためのモチベーション管理型育成ゲーム",
  applicationName: "ブンゴウクルー",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ブンゴウクルー" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <PWARegister />
          <NavigationVisibility />
          {children}
          <GlobalTimerNotice />
        </ToastProvider>
      </body>
    </html>
  );
}

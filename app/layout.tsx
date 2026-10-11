
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavigationVisibility from "@/components/NavigationVisibility";
import GlobalTimerNotice from "@/components/GlobalTimerNotice";
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
        <NavigationVisibility />
        {children}
        <GlobalTimerNotice />
      </body>
    </html>
  );
}
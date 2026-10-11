"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";

const authRoutes = ["/login", "/signup", "/register", "/auth", "/forgot-password", "/reset-password"];

export default function NavigationVisibility() {
  const pathname = usePathname();
  const authPage = authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  if (authPage) return null;

  // ヘッダーを通常の文書フローに置くことで、全ページの本文がヘッダーの下から始まる。
  // sticky はスクロール時に上部に留まるが、fixed と異なり高さ分の領域を確保する。
  return (
    <>
      <div className="sticky top-0 z-40 w-full">
        <Header />
      </div>
      <BottomNavigation />
    </>
  );
}

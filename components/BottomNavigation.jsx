"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 実際のルートが異なる場合は href のみ変更してください。
const items = [
  { label: "タイムライン", href: "/timeline", icon: "timeline" },
  { label: "検索", href: "/search", icon: "search" },
  { label: "ホーム", href: "/", icon: "home" },
  { label: "クエスト", href: "/quests", icon: "quest" },
  { label: "マイページ", href: "/mypage", icon: "user" },
];

function NavIcon({ name }) {
  const common = {
    width: 25,
    height: 25,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "timeline":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
    case "search":
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
    case "home":
      return <svg {...common}><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/></svg>;
    case "quest":
      return <svg {...common}><path d="M6 3h12v18l-6-3-6 3z"/><path d="m9 10 2 2 4-4"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
  }
}

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#f2deca] bg-[#fff9f0]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-5">
        {items.map(({ label, href, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={label}
              className={`flex min-w-0 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#c77f43] ${active ? "text-[#c77f43]" : "text-[#927b69] hover:text-[#c77f43]"}`}
            >
              <NavIcon name={icon} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

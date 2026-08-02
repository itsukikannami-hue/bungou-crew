"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const menuItems = [
    {
      name: "ダッシュボード",
      href: "/admin",
    },
    {
      name: "ユーザー管理",
      href: "/admin/users",
    },
    {
      name: "ポイント管理",
      href: "/admin/points",
    },
    {
      name: "アイテム管理",
      href: "/admin/items",
    },
    {
      name: "作品広告管理",
      href: "/admin/promotions",
    },
    {
      name: "クエスト管理",
      href: "/admin/quests",
    },
    {
      name: "課金管理",
      href: "/admin/payments",
    },
    {
      name: "案件管理",
      href: "/admin/offers",
    },
    {
      name: "広告管理",
      href: "/admin/ads",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="flex min-h-screen">

        {/* サイドバー */}
        <aside className="w-64 bg-white border-r border-gray-200">

          <div className="p-6 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">
              ブンゴウクルー
            </h1>

            <p className="text-xs text-gray-500 mt-1">
              管理者画面
            </p>
          </div>

          <nav className="p-4 space-y-1">

            {menuItems.map((item) => {

              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg text-sm transition ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}

          </nav>

        </aside>

        {/* メイン */}
        <main className="flex-1">

          <div className="p-6 md:p-8">
            {children}
          </div>

        </main>

      </div>

    </div>
  )
}
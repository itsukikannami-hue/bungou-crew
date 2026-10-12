"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error)
  }, [error])
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
      <h1 className="text-2xl font-bold">管理画面を表示できませんでした</h1>
      <p className="mt-4 text-gray-600">一時的な問題が発生しました。再試行しても解決しない場合は、時間をおいてお試しください。</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">再試行する</button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border px-6 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">ホームへ戻る</Link>
      </div>
    </main>
  )
}

"use client"

import Link from "next/link"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
      <h1 className="text-2xl font-bold">画面を表示できませんでした</h1>
      <p className="mt-4 text-gray-600">一時的なエラーが発生しました。再試行してください。</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">再試行する</button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border px-6 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">ホームへ戻る</Link>
      </div>
    </main>
  )
}

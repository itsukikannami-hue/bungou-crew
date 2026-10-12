"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
    if (process.env.NODE_ENV === "development") console.error("Page error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center" role="alert">
      <div className="text-5xl" aria-hidden="true">📖</div>
      <h1 className="mt-5 text-2xl font-bold">ページを表示できませんでした</h1>
      <p className="mt-4 text-sm leading-7 text-gray-600">一時的な問題が発生しました。もう一度お試しください。解決しない場合は、時間をおいてアクセスしてください。</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">もう一度試す</button>
        <Link href="/" className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">ホームに戻る</Link>
      </div>
    </main>
  );
}

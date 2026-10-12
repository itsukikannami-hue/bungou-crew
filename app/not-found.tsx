import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-sky-600" aria-hidden="true">404</p>
      <h1 className="mt-5 text-2xl font-bold">ページが見つかりません</h1>
      <p className="mt-4 text-sm leading-7 text-gray-600">URLが間違っているか、ページが移動・削除された可能性があります。</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">ホームに戻る</Link>
        <Link href="/help" className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">ヘルプを見る</Link>
      </div>
    </main>
  );
}

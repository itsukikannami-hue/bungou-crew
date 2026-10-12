type Props = { title: string; rows?: number; cards?: boolean }
export default function PageSkeleton({ title, rows = 4, cards = false }: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" role="status" aria-busy="true" aria-label={`${title}を読み込み中`}>
      <span className="sr-only">{title}を読み込んでいます</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-28 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none" />
        </div>
        <div className={cards ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm motion-reduce:animate-none">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full bg-gray-200" />
                <div className="w-full space-y-3">
                  <div className="h-4 w-2/5 rounded bg-gray-200" />
                  <div className="h-3 w-4/5 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-5 h-4 w-full rounded bg-gray-200" />
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

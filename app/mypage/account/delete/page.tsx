"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"

const CONFIRM_TEXT = "退会する"

export default function DeleteAccountPage() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const canDelete = useMemo(
    () => agreed && confirmText.trim() === CONFIRM_TEXT && !submitting,
    [agreed, confirmText, submitting]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canDelete) return

    const finalConfirm = window.confirm(
      "本当にアカウントを削除しますか？\n\nこの操作は取り消せません。"
    )
    if (!finalConfirm) return

    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRM_TEXT }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || "アカウントを削除できませんでした。時間をおいて再度お試しください。"
        )
      }

      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "アカウントを削除できませんでした。時間をおいて再度お試しください。"
      )
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1 text-sm font-bold text-[#8a684d] transition hover:opacity-70"
        >
          ← マイページに戻る
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#ead8c6] bg-white shadow-sm">
          <div className="border-b border-[#f0e3d7] bg-[#fff7ef] px-6 py-6 sm:px-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#b27b5c]">
              DELETE ACCOUNT
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#5f4635] sm:text-3xl">
              アカウント削除・退会
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#7a6657]">
              ブンゴウクルーを退会すると、アカウントと関連データが削除されます。
              内容を確認してから手続きを行ってください。
            </p>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-8 sm:py-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-black text-red-700">
                ⚠️ この操作は取り消せません
              </h2>
              <p className="mt-2 text-sm leading-7 text-red-700/90">
                退会後に同じメールアドレスで再登録しても、これまでのデータを元に戻すことはできません。
              </p>
            </div>

            <div>
              <h2 className="text-base font-black text-[#5f4635]">
                退会すると削除される主なデータ
              </h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#725d4e] sm:grid-cols-2">
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">✍️ 執筆記録・セッション</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">🐣 育成中のブンゴウ・図鑑</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">🏅 獲得したバッジ</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">💬 投稿・コメント・応援</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">👥 フォロー・フレンド情報</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">💌 DM・通知などの利用データ</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">🎁 ポイント・所持アイテム</li>
                <li className="rounded-xl bg-[#fff8f1] px-4 py-3">📚 プロフィール・作品リンク</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#ead8c6] bg-[#fffdf9] p-5">
              <h2 className="font-black text-[#5f4635]">
                プレミアムプランをご利用の場合
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#725d4e]">
                退会処理とあわせてプレミアム契約の終了処理を行います。
                退会後はブンゴウクルーのプレミアム機能を利用できません。
              </p>
            </div>

            <div className="rounded-2xl border border-[#ead8c6] p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 accent-[#9b6b4b]"
                />
                <span className="text-sm font-bold leading-6 text-[#655144]">
                  削除したデータを元に戻せないことを確認しました。
                </span>
              </label>

              <div className="mt-5">
                <label
                  htmlFor="delete-confirmation"
                  className="block text-sm font-black text-[#5f4635]"
                >
                  確認のため「退会する」と入力してください
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  disabled={submitting}
                  autoComplete="off"
                  placeholder="退会する"
                  className="mt-2 w-full rounded-xl border border-[#dbc8b7] bg-white px-4 py-3 text-base text-[#4f4036] outline-none transition placeholder:text-[#bca99a] focus:border-[#a97858] focus:ring-2 focus:ring-[#ead8c6]"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/mypage"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d9c5b3] bg-white px-6 text-sm font-black text-[#6f5949] transition hover:bg-[#fff8f1]"
                >
                  キャンセル
                </Link>

                <button
                  type="submit"
                  disabled={!canDelete}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200"
                >
                  {submitting ? "退会処理中..." : "アカウントを削除して退会する"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

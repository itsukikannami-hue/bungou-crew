"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")
    setMessage("")

    if (!password || !confirmPassword) {
      setError("パスワードを入力してください。")
      return
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致していません。")
      return
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    setLoading(false)

    if (error) {
      setError(
        "パスワードの変更に失敗しました。"
      )
      return
    }

    setMessage(
      "パスワードを変更しました。ログインページへ移動します。"
    )

    setTimeout(() => {
      router.push("/login")
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-block text-2xl font-bold text-gray-900">
            ブンゴウクルー
          </div>

          <p className="mt-2 text-sm text-gray-500">
            物書きのための創作コミュニティ
          </p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 sm:p-8">

          {/* タイトル */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900">
              パスワードを変更
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              新しいパスワードを入力してください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 新しいパスワード */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                新しいパスワード
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="6文字以上"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {/* パスワード確認 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                新しいパスワード（確認）
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="もう一度入力してください"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm leading-5 text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* 成功メッセージ */}
            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm leading-5 text-green-700">
                  {message}
                </p>
              </div>
            )}

            {/* 変更ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "変更中..."
                : "パスワードを変更"}
            </button>
          </form>

          {/* ログインへ戻る */}
          {!message && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                ← ログイン画面に戻る
              </button>
            </div>
          )}
        </div>

        {/* 下部説明 */}
        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          パスワードは他の人に知られないよう、
          安全に管理してください。
        </p>

      </div>
    </main>
  )
}
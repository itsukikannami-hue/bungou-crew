"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setMessage("")
    setError("")

    if (!email) {
      setError("メールアドレスを入力してください。")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

    setLoading(false)

    if (error) {
      setError(
        "パスワードリセットメールの送信に失敗しました。"
      )
      return
    }

    setMessage(
      "パスワードリセット用のメールを送信しました。メールをご確認ください。"
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* ロゴ */}
        <div className="text-center mb-8">
          <Link
            href="/login"
            className="inline-block text-2xl font-bold text-gray-900 hover:opacity-80 transition"
          >
            ブンゴウクルー
          </Link>

          <p className="mt-2 text-sm text-gray-500">
            物書きのための創作コミュニティ
          </p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 sm:p-8">

          {/* タイトル */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900">
              パスワードをリセット
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              登録しているメールアドレスを入力してください。
              <br />
              パスワードリセット用のメールを送信します。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* メールアドレス */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                メールアドレス
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                autoComplete="email"
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

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "送信中..."
                : "リセットメールを送信"}
            </button>
          </form>

          {/* ログインへ戻る */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              ← ログイン画面に戻る
            </Link>
          </div>
        </div>

        {/* 下部説明 */}
        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          パスワードリセットメールが届かない場合は、
          迷惑メールフォルダもご確認ください。
        </p>

      </div>
    </main>
  )
}
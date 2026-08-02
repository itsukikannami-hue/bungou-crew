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
    <main>
      <h1>パスワードをリセット</h1>

      <p>
        登録しているメールアドレスを入力してください。
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">
            メールアドレス
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "送信中..."
            : "リセットメールを送信"}
        </button>
      </form>

      {message && (
        <p>
          {message}
        </p>
      )}

      {error && (
        <p>
          {error}
        </p>
      )}

      <div>
        <Link href="/login">
          ログイン画面に戻る
        </Link>
      </div>
    </main>
  )
}

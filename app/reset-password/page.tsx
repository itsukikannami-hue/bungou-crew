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
    <main>
      <h1>パスワードを変更</h1>

      <p>
        新しいパスワードを入力してください。
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">
            新しいパスワード
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">
            新しいパスワード（確認）
          </label>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "変更中..."
            : "パスワードを変更"}
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
    </main>
  )
}
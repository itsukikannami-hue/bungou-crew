"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSignup = async () => {
    setError("")
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      alert("確認メールを送信しました。メールを確認してください")
      window.location.href = "/login"
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">新規登録</h1>

      {error && (
        <div className="mb-4 text-red-600 font-bold">{error}</div>
      )}

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-xs"
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-xs"
      />

      <button
        onClick={handleSignup}
        className="mb-4 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        登録
      </button>

      {/* ここが追加部分 */}
      <div className="mt-2">
        既に登録済みの方はこちら:{" "}
        <a
          href="/login"
          className="text-blue-500 hover:underline"
        >
          ログイン
        </a>
      </div>
    </main>
  )
}
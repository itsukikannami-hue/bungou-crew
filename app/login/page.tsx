"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { FcGoogle } from "react-icons/fc"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setError("")
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      // ログイン成功時はページリロード or ホームに遷移
      window.location.href = "/"
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  
    if (error) {
      setError(error.message)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">ログイン</h1>

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
        onClick={handleLogin}
        className="mb-4 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        ログイン
      </button>

      <div className="my-4 flex items-center">
  <div className="flex-1 border-t"></div>

  <span className="px-3 text-gray-500 text-sm">
    または
  </span>

  <div className="flex-1 border-t"></div>
</div>

<button
  onClick={handleGoogleLogin}
  className="mb-4 flex w-full max-w-xs items-center justify-center gap-3 rounded border border-gray-300 bg-white px-6 py-3 hover:bg-gray-100"
>
  <FcGoogle size={22} />

  Googleで続ける
</button>

      {/* ここが追加部分 */}
      <div className="mt-2">
        新規登録はこちら:{" "}
        <a
          href="/signup"
          className="text-blue-500 hover:underline"
        >
          サインアップ
        </a>
      </div>
    </main>
  )
}
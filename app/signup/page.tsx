"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ToastProvider"

export default function SignupPage() {
  const toast = useToast()
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submittingRef = useRef(false)

  const handleSignup = async () => {
    if (submittingRef.current || emailSent) return
    setError("")

    if (!agreed) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。")
      return
    }
    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。")
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const { error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signupError) {
        setError(signupError.message)
        return
      }

      setEmailSent(true)
      toast.success("確認メールを送信しました。メール内のリンクから登録を完了してください。")
    } catch {
      setError("登録処理中にエラーが発生しました。時間をおいて再度お試しください。")
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">新規登録</h1>
      {emailSent && (
        <div role="status" className="mb-6 w-full max-w-sm rounded-lg border border-green-300 bg-green-50 p-5 text-center text-gray-800">
          <p className="font-bold">確認メールを送信しました</p>
          <p className="mt-2 text-sm">メール内のリンクをクリックして登録を完了してください。</p>
          <Link href="/login" className="mt-4 inline-block font-bold text-blue-700 underline">ログイン画面へ</Link>
        </div>
      )}

      {!emailSent && (<div className="flex w-full flex-col items-center">
      {error && (
        <div role="alert" className="mb-4 text-red-600 font-bold">{error}</div>
      )}

      <input
        type="email"
        autoComplete="email"
        aria-label="メールアドレス"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-xs"
      />

      <input
        type="password"
        autoComplete="new-password"
        aria-label="パスワード"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-xs"
      />

      <label className="mb-4 flex max-w-xs items-start gap-2 text-sm leading-6 text-gray-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1.5 h-4 w-4 shrink-0"
        />
        <span>
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">利用規約</Link>
          および
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">プライバシーポリシー</Link>
          を確認し、同意します。
        </span>
      </label>

      <button
        type="button"
        onClick={handleSignup}
        disabled={!agreed || isSubmitting}
        className="mb-4 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "登録中..." : "登録"}
      </button>

      </div>)}

      <div className="mt-2">
        既に登録済みの方はこちら:{" "}
        <Link href="/login" className="text-blue-500 hover:underline">ログイン</Link>
      </div>

      <Link href="/contact" className="mt-5 text-sm text-gray-600 underline hover:text-gray-900">お問い合わせ</Link>
    </main>
  )
}

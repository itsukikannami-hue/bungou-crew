"use client"

import { useState } from "react"

export default function TestItemUsePage() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const testUseItem = async () => {
    setLoading(true)
    setResult("処理中...")

    try {
      const response = await fetch("/api/items/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "9d0e37f7-c543-486b-a7dd-a3eb94f345ea",
          itemId: "5d0ef037-481e-4eeb-be6d-836aa9a7e07f",
        }),
      })

      const data = await response.json()

      console.log("ITEM USE API RESULT:", data)

      setResult(
        JSON.stringify(data, null, 2)
      )
    } catch (error) {
      console.error(error)

      setResult(
        "エラーが発生しました。"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">

      <h1 className="text-2xl font-bold">
        アイテム使用API テスト
      </h1>

      <button
        type="button"
        onClick={testUseItem}
        disabled={loading}
        className="mt-6 rounded-lg bg-gray-900 px-5 py-3 text-white disabled:opacity-50"
      >
        {loading
          ? "処理中..."
          : "EXPブーストを使用する"}
      </button>

      <pre className="mt-6 whitespace-pre-wrap rounded-lg bg-gray-100 p-4">
        {result}
      </pre>

    </div>
  )
}
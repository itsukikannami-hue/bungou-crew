"use client"

import { useState } from "react"

type CallButtonProps = {
  friendId: string
  friendName: string
}

export default function CallButton({
  friendId,
  friendName
}: CallButtonProps) {
  const [calling, setCalling] = useState(false)

  const startCall = async () => {
    setCalling(true)
    // TODO: WebRTCのピア作成・シグナリング開始
    alert(`🔊 ${friendName}に通話リクエストを送信`)
  }

  const endCall = () => {
    setCalling(false)
    // TODO: WebRTC切断処理
    alert(`🛑 ${friendName}との通話を終了`)
  }

  return calling ? (
    <button
      onClick={endCall}
      className="bg-red-500 text-white px-3 py-1 rounded"
    >
      終了
    </button>
  ) : (
    <button
      onClick={startCall}
      className="bg-green-500 text-white px-3 py-1 rounded"
    >
      通話
    </button>
  )
}
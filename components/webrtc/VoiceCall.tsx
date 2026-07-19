"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"

interface VoiceCallProps {
  userId: string
  friendId: string
  onEnd: () => void
}

export default function VoiceCall({ userId, friendId, onEnd }: VoiceCallProps) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const startCall = async () => {
      try {
        // 1️⃣ マイク取得
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream

        // 2️⃣ PeerConnection作成
        const pc = new RTCPeerConnection()
        pcRef.current = pc
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        // ICE Candidate を送信
        pc.onicecandidate = e => {
          if (e.candidate) {
            supabase
              .from("webrtc_signaling")
              .insert({
                from_user: userId,
                to_user: friendId,
                candidate: JSON.stringify(e.candidate)
              })
          }
        }

        // Offer作成
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // SupabaseにOffer送信
        await supabase
          .from("webrtc_signaling")
          .insert({
            from_user: userId,
            to_user: friendId,
            offer: JSON.stringify(offer)
          })

        // Answerを待機
        subscriptionRef.current = supabase
          .channel("webrtc")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signaling", filter: `from_user=eq.${friendId},to_user=eq.${userId}` }, payload => {
            const data = payload.new
            if (!data?.answer) return
            const answer = JSON.parse(data.answer)
            pc.setRemoteDescription(answer)
          })
          .subscribe()
      } catch (err) {
        console.error(err)
        endCall()
      }
    }

    const endCall = () => {
      if (!isMounted) return
      // マイク停止
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      // PeerConnection終了
      pcRef.current?.close()
      pcRef.current = null
      // Supabaseサブスクリプション解除
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
      onEnd()
    }

    startCall()

    return () => {
      isMounted = false
      endCall()
    }
  }, [userId, friendId, onEnd])

  return (
    <div className="p-2 bg-green-100 rounded">
      発信中…
      <button
        className="ml-2 px-2 py-1 bg-red-500 text-white rounded"
        onClick={() => {
          localStreamRef.current?.getTracks().forEach(track => track.stop())
          pcRef.current?.close()
          onEnd()
        }}
      >
        終了
      </button>
    </div>
  )
}
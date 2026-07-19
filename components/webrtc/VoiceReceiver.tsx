"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"

interface VoiceReceiverProps {
  userId: string
  onAccept: (callerId: string) => void
}

export default function VoiceReceiver({ userId, onAccept }: VoiceReceiverProps) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const listenIncoming = async () => {
      subscriptionRef.current = supabase
        .channel("webrtc")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signaling", filter: `to_user=eq.${userId}` }, async payload => {
          const data = payload.new
          if (!data?.offer || !isMounted) return

          const pc = new RTCPeerConnection()
          pcRef.current = pc

          // 受信マイク取得
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          localStreamRef.current = stream
          stream.getTracks().forEach(track => pc.addTrack(track, stream))

          // ICE Candidate 送信
          pc.onicecandidate = e => {
            if (e.candidate) {
              supabase
                .from("webrtc_signaling")
                .insert({
                  from_user: userId,
                  to_user: data.from_user,
                  candidate: JSON.stringify(e.candidate)
                })
            }
          }

          // OfferをセットしてAnswer作成
          const offer = JSON.parse(data.offer)
          await pc.setRemoteDescription(offer)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await supabase
            .from("webrtc_signaling")
            .insert({
              from_user: userId,
              to_user: data.from_user,
              answer: JSON.stringify(answer)
            })

          onAccept(data.from_user)
        })
        .subscribe()
    }

    listenIncoming()

    return () => {
      isMounted = false
      // マイク停止
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      pcRef.current?.close()
      pcRef.current = null
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current)
    }
  }, [userId, onAccept])

  return null
}
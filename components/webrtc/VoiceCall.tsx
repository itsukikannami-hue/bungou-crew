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

  useEffect(() => {
    let isMounted = true

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        localStreamRef.current = stream

        const pc = new RTCPeerConnection()
        pcRef.current = pc

        // ローカルストリームを追加
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        // ICE Candidate 送信
        pc.onicecandidate = e => {
          if (e.candidate) {
            supabase
              .from("webrtc_signaling")
              .insert([{ from_user: userId, to_user: friendId, type: "candidate", candidate: e.candidate }])
          }
        }

        // Offer 作成 & Supabase に送信
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await supabase
          .from("webrtc_signaling")
          .insert([{ from_user: userId, to_user: friendId, type: "offer", sdp: offer.sdp }])

        // Supabase で Answer を監視
        const subscription = supabase
          .from(`webrtc_signaling:to_user=eq.${userId}`)
          .on("INSERT", payload => {
            const data = payload.new
            if (data.type === "answer") {
              const desc = { type: "answer", sdp: data.sdp } as RTCSessionDescriptionInit
              pc.setRemoteDescription(desc)
            } else if (data.type === "candidate") {
              pc.addIceCandidate(data.candidate)
            }
          })
          .subscribe()

        return () => {
          // Cleanup
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error("Failed to start call", err)
      }
    }

    startCall()

    return () => {
      isMounted = false

      // ストリーム停止
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }

      // PeerConnection を閉じる
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }

      onEnd()
    }
  }, [userId, friendId, onEnd])

  return null
}
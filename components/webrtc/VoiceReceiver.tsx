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
  const channelRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const startListening = async () => {
      // Realtime v2: channel を作る
      const channel = supabase.channel(`webrtc_${userId}`)
      channelRef.current = channel

      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webrtc_signaling', filter: `to_user=eq.${userId}` }, async payload => {
        if (!isMounted) return
        const data = payload.new

        if (data.type === "offer") {
          // 通話を受ける
          onAccept(data.from_user)

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          localStreamRef.current = stream

          const pc = new RTCPeerConnection()
          pcRef.current = pc
          stream.getTracks().forEach(track => pc.addTrack(track, stream))

          pc.onicecandidate = e => {
            if (e.candidate) {
              supabase
                .from("webrtc_signaling")
                .insert([{ from_user: userId, to_user: data.from_user, type: "candidate", candidate: e.candidate }])
            }
          }

          await pc.setRemoteDescription({ type: "offer", sdp: data.sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await supabase
            .from("webrtc_signaling")
            .insert([{ from_user: userId, to_user: data.from_user, type: "answer", sdp: answer.sdp }])
        }
      }).subscribe()
    }

    startListening()

    return () => {
      isMounted = false

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }

      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, onAccept])

  return null
}
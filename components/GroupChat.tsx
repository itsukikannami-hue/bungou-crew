"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { sendGroupMessage, getGroupMessages } from "@/lib/chat"
import { Room } from "livekit-client"

interface Props {
  groupId: string
}

type Message = {
  id: string
  group_id: string
  sender_id: string
  content: string
  created_at: string
}

type Member = {
  id: string
  user_id: string
  group_id: string
}

export default function GroupChat({ groupId }: Props) {

  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [stream, setStream] = useState<MediaStream | null>(null)

  // 🔥 通話状態
  const [inCall, setInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // 👇 通話参加者
  const [members, setMembers] = useState<Member[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)


  const peers = useRef<{ [key: string]: RTCPeerConnection }>({})
  const createPeer = (targetId: string, stream: MediaStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    })
  
    // 自分の音を送る
    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream)
    })
  
    // 相手の音を受信
    peer.ontrack = (event) => {
      const audio = new Audio()
      audio.srcObject = event.streams[0]
      audio.autoplay = true
    }
  
    // ICE
    peer.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from("signals").insert({
          to_user: targetId,
          from_user: userId,
          candidate: event.candidate
        })
      }
    }
  
    return peer
  }

  const callUser = async (targetId: string, stream: MediaStream) => {
    const peer = createPeer(targetId, stream)
    peers.current[targetId] = peer
  
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
  
    await supabase.from("signals").insert({
      to_user: targetId,
      from_user: userId,
      offer
    })
  }
  const handleCandidate = async (data: any) => {
    const peer = peers.current[data.from_user]
    if (!peer) return
  
    try {
      await peer.addIceCandidate(data.candidate)
    } catch (e) {
      console.error("ICE error:", e)
    }
  }
  const handleOffer = async (data: any) => {
    if (!stream) return

    const peer = createPeer(data.from_user, stream)
    peers.current[data.from_user] = peer
  
    await peer.setRemoteDescription(data.offer)
  
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
  
    await supabase.from("signals").insert({
      to_user: data.from_user,
      from_user: userId,
      answer
    })
  }
  const handleAnswer = async (data: any) => {
    const peer = peers.current[data.from_user]
    if (!peer) return
  
    await peer.setRemoteDescription(data.answer)
  }

  useEffect(() => {
    const channel = supabase
      .channel("signals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signals"
        },
        async (payload) => {
          const data = payload.new as any
  
          if (data.to_user !== userId) return
  
          if (!stream) return

          if (data.offer) {
            await handleOffer(data)
          }
          
          if (data.answer) {
            await handleAnswer(data)
          }
          
          if (data.candidate) {
            await handleCandidate(data)
          }
        }
      )
      .subscribe()
  
      return () => {
        void supabase.removeChannel(channel)
      }
  }, [userId, stream])

  const connectToAll = async (media: MediaStream) => {
    if (!members.length) return
  
    for (const m of members) {
      if (m.user_id === userId) continue
      await callUser(m.user_id, media)
    }
  }
  // 👤 ユーザー取得
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    }
    getUser()
  }, [])

  // 📥 メッセージ取得
  useEffect(() => {
    if (!groupId) return

    const fetch = async () => {
      const data = await getGroupMessages(groupId)
      setMessages((data ?? []) as Message[])
    }

    fetch()
  }, [groupId])

  // ⚡ realtime（チャット）
  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const m = payload.new as Message

          if (m.group_id === groupId) {
            setMessages(prev => {
              const exists = prev.some(p => p.id === m.id)
              if (exists) return prev
              return [...prev, m]
            })
          }
        }
      )
      .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
  }, [groupId])

  // 📤 送信
  const handleSend = async () => {
    if (!text.trim() || !userId || !groupId) return
    await sendGroupMessage(userId, groupId, text)
    setText("")
  }

  // 🎤 通話参加
  const joinCall = async () => {
    if (!userId || !groupId) return
  
    await supabase.from("group_call_members").insert({
      group_id: groupId,
      user_id: userId
    })
  
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true
    })
  
    setStream(media)
    setInCall(true)
  
    await connectToAll(media)
  }

  // 📞 通話開始
  const startCall = async () => {
    if (!userId || !groupId) return
  
    try {
      const token = await getToken(userId, groupId)
  
      const room = new Room()
  
      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL!,
        token,
        { autoSubscribe: true }
      )
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioTrack = stream.getAudioTracks()[0]
  
      await room.localParticipant.publishTrack(audioTrack)
  
      // 👇 ⭐ STEP5：他人の音（これが核心）
      room.on("trackSubscribed", (track, publication, participant) => {
  
        const audio = new Audio()

        audio.srcObject = new MediaStream([track.mediaStreamTrack])
        
        audio.autoplay = true
        
        audio.play().catch((e) => {
          console.log("autoplay blocked:", e)
        })
  
        document.body.appendChild(audio)
      })
  
      setStream(stream)
      setInCall(true)
  
    } catch (err) {
      console.error("call error:", err)
    }
  }

  const getToken = async (userId: string, roomName: string) => {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, roomName })
    })
  
    const data = await res.json()
    return data.token
  }

  // 🔇 ミュート
  const toggleMute = () => {
    if (!stream) return

    stream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
    })

    setIsMuted(prev => !prev)
  }

  // ❌ 通話終了
  const endCall = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    await supabase
      .from("group_call_members")
      .delete()
      .eq("user_id", userId)

    setStream(null)
    setInCall(false)
  }

  // ⚡ 通話開始検知
  useEffect(() => {
    const channel = supabase
      .channel("group-call")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_calls"
        },
        (payload) => {
          const call = payload.new as { group_id: string }
  
          if (call.group_id === groupId) {
            void joinCall()
          }
        }
      )
      .subscribe()
  
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [groupId])

  // 👥 メンバー監視
  useEffect(() => {
    if (!groupId) return

    const fetchMembers = async () => {
      const { data } = await supabase
        .from("group_call_members")
        .select("*")
        .eq("group_id", groupId)

        setMembers((data ?? []) as Member[])
    }

    fetchMembers()

    const channel = supabase
      .channel("call-members")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_call_members"
        },
        fetchMembers
      )
      .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
  }, [groupId])

  // スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!userId) return <div className="p-4">読み込み中...</div>

  // =========================
  // 📞 通話画面（LINE風）
  // =========================
  if (inCall) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-black via-green-950 to-black text-white">
  
        {/* 上部ステータスバー */}
        <div className="p-3 flex justify-between items-center border-b border-white/10">
          <div className="text-sm opacity-80">
            🔴 通話中
          </div>
  
          <div className="text-xs opacity-60">
            {members.length}人参加中
          </div>
        </div>
  
        {/* 参加者エリア */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
  
          {/* 自分 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-xl shadow-lg animate-pulse">
              YOU
            </div>
            <div className="text-xs mt-2 opacity-70">あなた</div>
          </div>
  
          {/* 他メンバー */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {members
              .filter(m => m.user_id !== userId)
              .map(m => (
                <div key={m.id} className="flex flex-col items-center">
  
                  <div className="
                    w-16 h-16 rounded-full bg-white/10
                    flex items-center justify-center
                    border border-white/20
                    shadow-md
                    hover:scale-105 transition
                  ">
                    👤
                  </div>
  
                  <div className="text-[10px] mt-1 opacity-70">
                    {m.user_id.slice(0, 6)}
                  </div>
  
                </div>
              ))}
          </div>
  
        </div>
  
        {/* 操作バー（LINE風） */}
        <div className="p-5 flex justify-center gap-6 border-t border-white/10 bg-black/40 backdrop-blur">
  
          {/* ミュート */}
          <button
            onClick={toggleMute}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              transition
              ${isMuted ? "bg-red-500" : "bg-white/10"}
            `}
          >
            🎤
          </button>
  
          {/* スピーカー（ダミー） */}
          <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            🔊
          </button>
  
          {/* 退出 */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg"
          >
            📞
          </button>
  
        </div>
      </div>
    )
  }

  // =========================
  // 💬 通常チャット
  // =========================
  return (
    <div className="w-full max-w-md mx-auto h-screen flex flex-col bg-gray-100">

      {/* ヘッダー */}
      <div className="p-3 bg-green-500 text-white flex justify-between">
        <span>グループチャット</span>

        <button
          onClick={startCall}
          className="bg-white text-green-600 px-3 py-1 rounded-full text-sm"
        >
          📞 通話
        </button>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => {
          const isMe = m.sender_id === userId

          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`
                  px-4 py-2 rounded-2xl max-w-[70%] text-sm shadow
                  ${isMe
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-white text-black rounded-bl-none"}
                `}
              >
                <div>{m.content}</div>

                {m.created_at && (
                  <div
                    className={`
                      text-[10px] mt-1 text-right
                      ${isMe ? "text-green-100" : "text-gray-400"}
                    `}
                  >
                    {new Date(m.created_at).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力 */}
      <div className="p-2 bg-white flex gap-2 border-t">
        <input
          className="flex-1 border rounded-full px-4 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="bg-green-500 text-white px-4 rounded-full text-sm"
        >
          送信
        </button>
      </div>
    </div>
  )
}
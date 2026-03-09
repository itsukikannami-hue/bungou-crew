"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

import Header from "@/components/Header"
import BungouPet from "@/components/BungouPet"
import Timer from "@/components/Timer"
import FriendSearch from "@/components/FriendSearch"
import WeeklyCharts from "@/components/WeeklyCharts"
import SessionHistory from "@/components/SessionHistory"
import SessionModal from "@/components/modals/SessionModal"
import StopModal from "@/components/modals/StopModal"
import VoiceCall from "@/components/webrtc/VoiceCall"
import VoiceReceiver from "@/components/webrtc/VoiceReceiver"
import CallingStatus from "@/components/webrtc/CallingStatus"
import GroupList from "@/components/GroupList"
import { createGroup, addMember, listGroups } from "@/lib/group"

export default function Home() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [sessions,setSessions] = useState<any[]>([])
  const [weeklyTime, setWeeklyTime] = useState<any[]>([])
  const [weeklyWords, setWeeklyWords] = useState<any[]>([])
  const [todayTime,setTodayTime] = useState(0)
  const [showModal,setShowModal] = useState(false)
  const [showStopModal,setShowStopModal] = useState(false)

  // 通話関連
  const [friendIdToCall, setFriendIdToCall] = useState<string | null>(null)
  const [calling, setCalling] = useState(false)

  // グループ関連
  const [groups, setGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState("")

  const handleCreateGroup = async () => {
    if (!user || !newGroupName) return
    try {
      const group = await createGroup(user.id, newGroupName)
      await addMember(group.id, user.id) // 作成者もメンバーに追加
      const userGroups = await listGroups(user.id)
      setGroups(userGroups)
      setNewGroupName("")
    } catch (error) {
      console.error("グループ作成エラー:", error)
    }
  }

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return
      try {
        const userGroups = await listGroups(user.id)
        setGroups(userGroups)
      } catch (error) {
        console.error(error)
      }
    }
    fetchGroups()
  }, [user])

  // ユーザー認証
  useEffect(()=>{
    const checkUser = async()=>{
      const { data:{ user } } = await supabase.auth.getUser()
      if(!user){
        router.push("/login")
      }else{
        setUser(user)
      }
    }
    checkUser()
  },[])

  // 週間データ取得
  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from("sessions")
        .select("created_at,duration,words")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString());

      if (!data) return;

      const timeMap: Record<string, number> = {};
      const wordMap: Record<string, number> = {};

      data.forEach((s: any) => {
        const date = new Date(s.created_at).toLocaleDateString("ja-JP", {
          timeZone: "Asia/Tokyo"
        });
        timeMap[date] = (timeMap[date] || 0) + s.duration
        wordMap[date] = (wordMap[date] || 0) + s.words
      });

      setWeeklyTime(Object.keys(timeMap).map(date => ({ date, minutes: Math.floor(timeMap[date]/60) })))
      setWeeklyWords(Object.keys(wordMap).map(date => ({ date, words: wordMap[date] })))
    };
    fetchWeeklyData();
  }, [user])

  return (
    <>
      <Header/>

      <main className="min-h-screen flex flex-col items-center bg-gray-50 p-6 space-y-6">
        <h1 className="text-3xl font-bold">ブンゴウクルー</h1>

        {/* フレンド検索 */}
        <FriendSearch user={user} onCall={(friendId: string) => { setFriendIdToCall(friendId); setCalling(true) }}/>

        {/* グループ作成 */}
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-2">グループ作成</h2>
          <div className="flex mb-4">
            <input
              type="text"
              placeholder="新しいグループ名"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="flex-1 p-2 border rounded-l"
            />
            <button
              onClick={handleCreateGroup}
              className="p-2 bg-blue-500 text-white rounded-r"
            >
              作成
            </button>
          </div>
          {/* グループ一覧 */}
          <GroupList userId={user?.id} />
        </div>

        {/* ペット */}
        <BungouPet/>

        {/* タイマー */}
        <Timer
          todayTime={todayTime}
          setTodayTime={setTodayTime}
          setShowModal={setShowModal}
          setShowStopModal={setShowStopModal}
        />

        {/* 週間チャート */}
        <WeeklyCharts weeklyTime={weeklyTime} weeklyWords={weeklyWords} />

        {/* 執筆履歴 */}
        <SessionHistory sessions={sessions} />

        {/* モーダル */}
        {showModal && <SessionModal setShowModal={setShowModal} />}
        {showStopModal && <StopModal setShowStopModal={setShowStopModal} setShowModal={setShowModal} />}

        {/* 発信側 */}
        {friendIdToCall && <VoiceCall friendId={friendIdToCall} userId={user.id} onEnd={() => { setFriendIdToCall(null); setCalling(false) }}/>}
        {/* 受信側 */}
        {user && !friendIdToCall && <VoiceReceiver userId={user.id} onAccept={(callerId) => { setFriendIdToCall(callerId); setCalling(true) }}/>}
        {/* 通話ステータス */}
        {calling && <CallingStatus />}
      </main>
    </>
  )
}
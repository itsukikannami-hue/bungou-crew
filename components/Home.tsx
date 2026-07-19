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
import DMChat from "@/components/DMChat"
import { updateStatus } from "@/lib/status"
import GroupChat from "@/components/GroupChat"
import NotificationList from "@/components/NotificationList"
import WritingUsers from "@/components/WritingUsers"
import ProfilePage from "@/components/profile/ProfilePage"
import Link from "next/link"
import HomeBungou from "@/components/HomeBungou"


export default function Home() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [sessions,setSessions] = useState<any[]>([])
  const [weeklyTime, setWeeklyTime] = useState<any[]>([])
  const [weeklyWords, setWeeklyWords] = useState<any[]>([])
  const [todayTime,setTodayTime] = useState(0)
  const [showModal,setShowModal] = useState(false)
  const [showStopModal,setShowStopModal] = useState(false)

  const [sessionDuration, setSessionDuration] = useState(0)
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
    if (!user) return
    updateStatus(user.id, "online")
  }, [user])
  
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

  // --- 執筆履歴データ取得 ---
useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
  
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("created_at,duration,words")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }); // 最新順
  
        if (error) throw error;
  
        if (data) setSessions(data);
      } catch (err) {
        console.error("セッション取得エラー:", err);
      }
    };
  
    fetchSessions();
  }, [user]);

  return (
    <>
      <Header/>

      <main className="min-h-screen flex flex-col items-center bg-gray-50 p-6 space-y-6">

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
          {groups.map(g => (
  <Link key={g.id} href={`/group/${g.id}`}>
    <div className="p-2 border mb-1 cursor-pointer hover:bg-gray-100 transition">
      {g.name}
    </div>
  </Link>
))}
        </div>

        {/* ペット */}
        <HomeBungou />
<Link href="/album">
  <button>
    📚 アルバム
  </button>
</Link>

<Link href="/data">
  <button>
    📊 データ
  </button>
</Link>

<Link href="/mypage">
    <button className="px-4 py-2 bg-purple-500 text-white rounded-lg">
      👤 マイページ
    </button>
  </Link>

  <Link href="/timeline">
  <button
    className="
      w-full
      max-w-md
      bg-green-500
      text-white
      py-3
      rounded-xl
      shadow
      hover:bg-green-600
    "
  >
    📝 タイムライン
  </button>
</Link>

<Link href="/search">
  <button
    className="
      w-full
      max-w-md
      bg-purple-500
      text-white
      py-3
      rounded-xl
      shadow
      hover:bg-purple-600
    "
  >
    🔍 検索
  </button>
</Link>

        {user && friendIdToCall && (
  <DMChat
    userId={user.id}
    friendId={friendIdToCall}
  />
)}


{user && <NotificationList userId={user.id} />}


        {/* モーダル */}
        {showModal && (
  <SessionModal
    user={user}
    duration={sessionDuration}
    setShowModal={setShowModal}
  />
)}
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
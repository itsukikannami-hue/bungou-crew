"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import StartModal from "@/components/StartModal"
import Confetti from "react-confetti"
import { useRef } from "react"
import {
  awardBadge,
  checkFirstWrite,
  checkTotalWords,
  checkSingleWrite,
  checkTotalHours,
  checkWritingStreak,
  checkGrowthBadges
} from "@/lib/badges"


export default function HomeBungou() {


  const grantRareBungou = async (userId) => {
    const { data: rareList } = await supabase
      .from("bungou_species")
      .select("*")
      .eq("rarity", "rare")
  
    if (!rareList?.length) return
  
    const randomRare =
      rareList[Math.floor(Math.random() * rareList.length)]
  
    await supabase.from("bungou_instances").insert({
      user_id: userId,
      species_id: randomRare.id,
      stage: 0,
      exp: 0,
      status: "growing",
      last_written_at: new Date().toISOString()
    })
  }

  const isFetchingRef = useRef(false)
  const [loading, setLoading] = useState(true)

  const [bungou, setBungou] = useState(null)

  const [showInfo, setShowInfo] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)

  const [timer, setTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)

  const [inputWords, setInputWords] = useState(0)

  const [showExpScreen, setShowExpScreen] = useState(false)
  const [earnedExp, setEarnedExp] = useState(0)
  const [isCritical, setIsCritical] = useState(false)

  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [isIdle, setIsIdle] = useState(false)
  const [isFacingRight, setIsFacingRight] = useState(false)
  const [isWalking, setIsWalking] = useState(false)

  const [showEvolutionScreen, setShowEvolutionScreen] = useState(false)
  const [evolutionStage, setEvolutionStage] = useState(0)
  const [evolutionTitle, setEvolutionTitle] = useState("")
  const [evolutionMessage, setEvolutionMessage] = useState("")

  const [showBadgeModal, setShowBadgeModal] =
  useState(false)

  const [nextModal, setNextModal] =
  useState(null)

  const [earnedBadgesQueue, setEarnedBadgesQueue] = useState([])
  const [earnedBadge, setEarnedBadge] = useState(null)
  const [isProcessingBadges, setIsProcessingBadges] = useState(false)

  const [isPosted,setIsPosted] = useState(false)

  const [showPostModal,setShowPostModal] = useState(false)
const [postText,setPostText] = useState("")


const openWritingPost = async () => {

  const { data:{ user } } = await supabase.auth.getUser()
  

  if(!user) return
  
  
  // 累計文字数取得
  const { data:logs } = await supabase
  .from("writing_logs")
  .select("words")
  .eq("user_id",user.id)
  
  
  const totalWords =
  logs?.reduce(
  (sum,r)=>sum+r.words,
  0
  ) ?? 0
  
  
  
  const defaultText =
  `✍️ 今日は${inputWords}文字書きました！
  
  累計${totalWords}文字`
  
  
  setPostText(defaultText)
  
  setShowPostModal(true)
  
  }

  const submitWritingPost = async()=>{

    const { data:{ user } } = await supabase.auth.getUser()
    
    if(!user) return
    
    
    // 空白チェック
    if(!postText.trim()){
     alert("投稿内容を入力してください")
     return
    }
    
    
    const {error}=await supabase
    .from("posts")
    .insert({
     user_id:user.id,
     content:postText.trim()
    })
    
    
    if(error){
     console.error("POST ERROR:", error.message)
     console.error("DETAILS:", error.details)
     console.error("HINT:", error.hint)
     return
    }
    
    
    setShowPostModal(false)
    setIsPosted(true)
    
    }

  const shownBadgesRef = useRef(new Set())
  useState(null)
  const BADGE_DATA = {
    first_write: {
      name: "初執筆",
      icon: "✍️",
      rarity: "Common",
      description:
        "はじめて執筆を完了した"
    },

    total_1000: {
      name: "千文字の壁",
      icon: "📝",
      rarity: "Common",
      description: "累計1000文字達成"
    },
    
    total_10000: {
      name: "駆け出し作家",
      icon: "📖",
      rarity: "Rare",
      description: "累計1万文字達成"
    },
    
    total_50000: {
      name: "中編作家",
      icon: "📚",
      rarity: "Rare",
      description: "累計5万文字達成"
    },
    
    total_100000: {
      name: "長編作家",
      icon: "🏅",
      rarity: "Epic",
      description: "累計10万文字達成"
    },
    
    total_500000: {
      name: "活字の海",
      icon: "🌊",
      rarity: "Epic",
      description: "累計50万文字達成"
    },
    
    total_1000000: {
      name: "百万字の魔物",
      icon: "💎",
      rarity: "Legend",
      description: "累計100万文字達成"
    },
    
    single_3000: {
      name: "一気呵成",
      icon: "🔥",
      rarity: "Common",
      description: "1回で3000文字執筆"
    },
    
    single_5000: {
      name: "超集中",
      icon: "⚡",
      rarity: "Rare",
      description: "1回で5000文字執筆"
    },
    
    hours_10: {
      name: "執筆マラソン",
      icon: "⏰",
      rarity: "Rare",
      description: "累計10時間執筆"
    },
    
    hours_100: {
      name: "活字中毒",
      icon: "👑",
      rarity: "Epic",
      description: "累計100時間執筆"
    },

    streak_3: {
      name: "三日坊主突破",
      icon: "🔥",
      rarity: "Common",
      description: "3日連続執筆"
    },
    
    streak_7: {
      name: "一週間継続",
      icon: "📅",
      rarity: "Rare",
      description: "7日連続執筆"
    },
    
    streak_15: {
      name: "半月継続",
      icon: "📖",
      rarity: "Rare",
      description: "15日連続執筆"
    },
    
    streak_30: {
      name: "一ヶ月継続",
      icon: "🏅",
      rarity: "Epic",
      description: "30日連続執筆"
    },
    
    streak_100: {
      name: "執筆習慣化",
      icon: "👑",
      rarity: "Epic",
      description: "100日連続執筆"
    },
    
    streak_365: {
      name: "不屈の作家",
      icon: "💎",
      rarity: "Legend",
      description: "365日連続執筆"
    },

    first_hatch: {
      name: "はじめての孵化",
      icon: "🐣",
      rarity: "Common",
      description: "初めてブンゴウを孵化させた"
    },
    
    first_debut: {
      name: "初デビュー",
      icon: "🎉",
      rarity: "Common",
      description: "初めてデビューさせた"
    },
    
    rare_birth: {
      name: "レア誕生",
      icon: "⭐",
      rarity: "Rare",
      description: "レア種を獲得した"
    },
    
    collector_10: {
      name: "蒐集家",
      icon: "📚",
      rarity: "Rare",
      description: "図鑑10種達成"
    },
    
    collector_30: {
      name: "図鑑好き",
      icon: "📖",
      rarity: "Epic",
      description: "図鑑30種達成"
    },
    
    collector_all: {
      name: "ブンゴウ博士",
      icon: "🏆",
      rarity: "Legend",
      description: "全種コンプリート"
    },


  }

  // =========================
  // 🐣 ブンゴウ取得（修正版）
  // =========================
  const fetchBungou = async () => {
    console.log("🚀 fetchBungou start")
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      isFetchingRef.current = false
      return
    }
      console.log("👤 user:", user)
      if (!user) return

      const { data: instance, error } = await supabase
      .from("bungou_instances")
      .select(`
        *,
        bungou_species (*)
      `)
      .eq("user_id", user.id)
      .eq("status", "growing")
      .maybeSingle()
      console.log("📦 instance:", instance)
    if (error) {
      console.error("SELECT ERROR:", error)
      setLoading(false)
      return
    }

    console.log("🟡 SELECT error:", error)
    console.log("📦 SELECT instance:", instance)
    if (!instance) {
      const { data: speciesList } = await supabase
      .from("bungou_species")
      .select("*")
      .eq("rarity", "normal")
      console.log("🌱 speciesList:", speciesList)
      if (!speciesList?.length) {
        setLoading(false)
        isFetchingRef.current = false
        return
      }
    
      const randomSpecies =
        speciesList[Math.floor(Math.random() * speciesList.length)]
    
      const { error } = await supabase
        .from("bungou_instances")
        .upsert(
          {
            user_id: user.id,
            species_id: randomSpecies.id,
            stage: 0,
            exp: 0,
            status: "growing",
            last_written_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        )
    
      if (error) {
        console.log(error)
        setLoading(false)
        isFetchingRef.current = false
        return
      }
    
      // 🔥ここが超重要（即リターンせず再取得）
      isFetchingRef.current = false
      return fetchBungou()
    }



  
      // =========================
      // 初回ユーザー
      // =========================
      const { count } = await supabase
  .from("bungou_instances")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)

if (count === 0) {

        const { data: speciesList } = await supabase
          .from("bungou_species")
          .select("*")
      
        if (!speciesList || speciesList.length === 0) {
          setLoading(false)
          return
        }
      
        const randomSpecies =
          speciesList[Math.floor(Math.random() * speciesList.length)]
      
          const { data: existing } = await supabase
          .from("bungou_instances")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "growing")
          .maybeSingle()
        
        if (existing) return
      
        setLoading(false)
        isFetchingRef.current = false
        return
      }
  
      // =========================
      // 放置処理
      // =========================
      const lastWritten = new Date(
        instance?.last_written_at ?? Date.now()
      )
  
      const diffDays = Math.floor(
        (Date.now() - lastWritten.getTime()) /
        (1000 * 60 * 60 * 24)
      )
  
      let updatedInstance = { ...instance }
  
      if (diffDays > 3) {
        const newExp = (instance.exp || 0) - (diffDays - 3) * 1000
  
        if (newExp <= 0) {

          // ✅ 修正①：必ずデビュー固定
          const finalStage = 3
        
          console.log("🟡 album insert start", {
            user_id: user.id,
            species_id: instance.species_id,
            final_stage: finalStage,
            status: "debut"
          })
        
          // ✅ 修正②・③：安全な upsert + 固定値
          const { data, error } = await supabase
            .from("bungou_album")
            .upsert({
              user_id: user.id,
              species_id: instance.species_id,
              final_stage: 3,
              status: "debut"
            }, {
              onConflict: "user_id,species_id"
            })
            .select()
        
          console.log("🟢 album insert result:", { data, error })
        
          await supabase
            .from("bungou_instances")
            .delete()
            .eq("id", instance.id)
        
          return fetchBungou()
        }
  
        await supabase
          .from("bungou_instances")
          .update({ exp: newExp })
          .eq("id", instance.id)
  
        updatedInstance.exp = newExp
      }
  
      setBungou(updatedInstance)
      console.log("🐣 bungou:", updatedInstance)
console.log("🌱 species:", updatedInstance?.bungou_species)



      setLoading(false)
  
      if (updatedInstance.species_id) {
        console.log("🔥 fetchBungou reached species block")
        const { data: sp } = await supabase
          .from("bungou_species")
          .select("*")
          .eq("id", updatedInstance.species_id)
          .limit(1)

          console.log("🐣 instance:", updatedInstance)
          console.log("🧬 species_id:", updatedInstance.species_id)
          console.log("🌱 species:", sp)
          
      }
  
    } catch (err) {
      console.error("fetchBungou error:", err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchBungou()
  }, [])

  // =========================
  // 🐾 表示制御（修正なし）
  // =========================

  useEffect(() => {
    if (!bungou || bungou.stage === 0) return

    const moveLoop = () => {
      setIsIdle(true)

      const idleTime = 2000 + Math.random() * 3000

      setTimeout(() => {
        setIsIdle(false)
        setIsWalking(true)

        const randomX = Math.floor(Math.random() * 70)
        const randomY = Math.floor(Math.random() * 60)

        setPosition(prev => {
          setIsFacingRight(randomX > prev.x)
          return { x: randomX, y: randomY }
        })

        setTimeout(() => setIsWalking(false), 2500)

      }, idleTime)
    }

    moveLoop()

    const interval = setInterval(moveLoop, 7000)
    return () => clearInterval(interval)

  }, [bungou])

  // =========================
  // ⏱ タイマー系（変更なし）
  // =========================

  useEffect(() => {
    const minutes = localStorage.getItem("timer_minutes")
    const bungouId = localStorage.getItem("target_bungou_id")

    if (!minutes || !bungouId) return

    setTimer({
      minutes: Number(minutes),
      bungouId
    })

    setTimeLeft(Number(minutes) * 60)

    localStorage.removeItem("timer_minutes")
    localStorage.removeItem("target_bungou_id")
  }, [])

  useEffect(() => {
    if (!timer) return
  
    if (timeLeft <= 0) {
      setTimeLeft(0)
  
      handleFinish()
  
      return
    }
  
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
  
    return () => clearInterval(interval)
  
  }, [timer, timeLeft])

  // =========================
  // ⏰ 終了処理
  // =========================
  const handleFinish = () => {
    if (showFinishModal) return
    setShowFinishModal(true)
  }

  // =========================
  // 🎯 EXP処理（変更なし）
  // =========================
  const handleSubmitResult = async () => {

    const unlockedBadges = []

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existingBadges, error: badgeError } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", user.id)
  
  console.log("badgeError", badgeError)
  console.log(
    "existingBadges",
    JSON.stringify(existingBadges, null, 2)
  )
  
  const ownedBadgeSet = new Set(
    existingBadges?.map(b => b.badge_key) || []
  )
  
  console.log("ownedBadgeSet", [...ownedBadgeSet])

    const words = Number(inputWords || 0)
    const minutes = Number(timer.minutes || 0)

    const expGain = words + minutes * 5

    const now = new Date()

    const hour = now.getHours()
    
    let hourBucket = "night"
    
    if (hour >= 5 && hour < 12) {
      hourBucket = "morning"
    }
    else if (hour >= 12 && hour < 18) {
      hourBucket = "afternoon"
    }
    else {
      hourBucket = "night"
    }
    
    const wordsPerMinute =
      minutes > 0
        ? Math.round(words / minutes)
        : 0
    
    await supabase
      .from("writing_logs")
      .insert({
        user_id: user.id,
        words,
        minutes,
        words_per_minute: wordsPerMinute,
        hour_bucket: hourBucket
      })


      // 初執筆
      const firstBadge = await checkFirstWrite(user.id)

      console.log("firstBadge", firstBadge)
console.log("alreadyOwned", ownedBadgeSet.has(firstBadge))

      if (firstBadge && !ownedBadgeSet.has(firstBadge)) {
        await awardBadge(user.id, firstBadge)
        unlockedBadges.push(firstBadge)
      }
      
      const totalWordsBadges = await checkTotalWords(user.id)

      console.log("totalWordsBadges", totalWordsBadges)

      for (const badge of totalWordsBadges) {
        if (ownedBadgeSet.has(badge)) continue
      
        await awardBadge(user.id, badge)
        console.log("獲得:", badge)
        unlockedBadges.push(badge)
        shownBadgesRef.current.add(badge)
      }
      
      const singleWriteBadges = await checkSingleWrite(words)

      console.log("singleWriteBadges", singleWriteBadges)

      for (const badge of singleWriteBadges) {
        if (ownedBadgeSet.has(badge)) continue
      
        await awardBadge(user.id, badge)
        unlockedBadges.push(badge)
      }
      
      const totalHoursBadge = await checkTotalHours(user.id)

      if (totalHoursBadge && !ownedBadgeSet.has(totalHoursBadge)) {
        await awardBadge(user.id, totalHoursBadge)
        unlockedBadges.push(totalHoursBadge)
      }
      
      const streakBadge = await checkWritingStreak(user.id)

      if (streakBadge && !ownedBadgeSet.has(streakBadge)) {
        await awardBadge(user.id, streakBadge)
        unlockedBadges.push(streakBadge)
      }

      const allBadges = unlockedBadges

      const newBadges = [...new Set(allBadges)]
      
      newBadges.forEach(id => {
        shownBadgesRef.current.add(id)
      })
      
      if (newBadges.length > 0) {
        const queue = newBadges.map(id => BADGE_DATA[id])
      
        setEarnedBadgesQueue(queue)
        setEarnedBadge(queue[0])
        setShowBadgeModal(true)
      }


// 重複も削除
const uniqueBadges = [...new Set(newBadges)]

// 表示処理
    setEarnedExp(expGain)

    const newExp = (bungou.exp || 0) + expGain

    let nextStage = bungou.stage || 0
    
    if (nextStage === 0 && newExp >= 5000) {
      nextStage = 1
    }
    else if (nextStage === 1 && newExp >= 12500) {
      nextStage = 2
    }
    else if (nextStage === 2 && newExp >= 22500) {
      nextStage = 3
    }

    const currentStage = bungou.stage || 0
    const stageUp = nextStage > currentStage
    
    if (stageUp) {

      const { data, error } = await supabase
        .from("bungou_album")
        .upsert(
          {
            user_id: user.id,
            species_id: bungou.species_id,
            final_stage: nextStage,
            status: nextStage === 3 ? "debut" : "active"
          },
          {
            onConflict: "user_id,species_id",
            ignoreDuplicates: false
          }
        )
        .select()
    
      console.log("album upsert result:", { data, error })
    }

    if (nextStage < 3) {

      await supabase
        .from("bungou_instances")
        .update({
          exp: newExp,
          stage: nextStage,
          last_written_at: new Date().toISOString()
        })
        .eq("id", timer.bungouId)

    } else {

      await supabase.from("bungou_instances")
        .update({ status: "debut" })
        .eq("id", timer.bungouId)


        await supabase.from("bungou_album").insert({
          user_id: user.id,
          species_id: bungou.species_id,
          final_stage: nextStage,
          status: "debut"
        })
    }

    if (stageUp) {

      setEvolutionStage(nextStage)
    
      // =========================
      // 🐣 孵化
      // =========================
      if (nextStage === 1) {

        await checkGrowthBadges(
          user.id,
          bungou.species_id,
          1
        )

        setEvolutionTitle(
          `おめでとう！卵から ${species?.name ?? "ブンゴウ"} が生まれたよ！`
        )
      
        setEvolutionMessage(
          species?.evolve_message_stage1 || ""
        )
      }
    
      // =========================
      // ✨ セミプロ
      // =========================
      else if (nextStage === 2) {

        setEvolutionTitle(
          `おめでとう！${species?.name} が次のステージに進んだよ！アルバムをチェックしてみよう！`
        )
      
        setEvolutionMessage(
          species?.evolve_message_stage2 || ""
        )
      }
      
      else if (nextStage === 3) {

        await checkGrowthBadges(
          user.id,
          bungou.species_id,
          3
        )
      
        setEvolutionTitle(
          `おめでとう！${species?.name} は見事小説家としてのデビューを果たした！アルバムをチェックしてみよう！`
        )
      
        setEvolutionMessage(
          species?.evolve_message_stage3 || ""
        )
      }
    
      setShowEvolutionScreen(true)
    
    } else {
    
      // 通常EXP画面
      setShowExpScreen(true)
    }
  }

  // =========================
  // 🧠 ローディング制御（ここ重要）
  // =========================
  if (loading) return <div>読み込み中...</div>

if (!bungou) {
  return <div>🥚 卵を生成中...</div>
}


const species = bungou?.bungou_species
const stage = bungou?.stage ?? 0
const isEgg = stage === 0

const currentStage = bungou?.stage || 0
const currentExp = bungou?.exp || 0

const EXP_TABLE = {
  0: 5000,
  1: 12500,
  2: 22500,
}

const nextExp = EXP_TABLE[currentStage] ?? 10000
const remainingExp = Math.max(nextExp - currentExp, 0)

  return (
    <div className="relative w-full h-[400px] bg-green-50 rounded-xl overflow-hidden">

      {/* 🐣 卵 */}
      {isEgg && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce-slow cursor-pointer"
          onClick={() => setShowInfo(prev => !prev)}
        >
<img
src={
  isEgg
    ? "/images/bungou/egg.png"
    : species?.image_url
}
  width={80}
/>
        </div>
      )}

      {/* 🐾 キャラ */}
      {!isEgg && (
        <div
        className="absolute cursor-pointer transition-all duration-[7500ms] ease-in-out"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`
        }}
        onClick={() => setShowInfo(prev => !prev)}
      >
<img
  src={
    isEgg
      ? "/images/bungou/egg.png"
      : `${species?.image_url}?v=${Date.now()}`
  }
  width={80}
  className={`
  transition-transform duration-500

  ${isIdle ? "animate-idle" : ""}

  ${isWalking ? "animate-walk" : ""}

  ${isFacingRight ? "-scale-x-100" : ""}
  `}
/>
        </div>
      )}

      {/* ▶ スタート */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setShowStartModal(true)}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow"
        >
          ▶ スタート
        </button>
      </div>

      {/* ⏱ タイマー */}
      {timer && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-white shadow-lg px-6 py-3 rounded-xl text-lg font-bold z-50">
          ⏱ 残り時間：
          {Math.floor(timeLeft / 60)}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {/* 📊 情報パネル */}
      {showInfo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[140%] w-64 p-3 bg-white rounded-lg border text-sm shadow-lg z-20">

          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-1 right-2 text-gray-500"
          >
            ×
          </button>

          <div className="font-bold mb-2">
            {isEgg ? "？？？" : species?.name}
          </div>

          <div>現在EXP: {currentExp}</div>

          <div>次まで: {remainingExp} EXP</div>

        </div>
      )}

      {/* 🟦 StartModal */}
      {showStartModal && (
        <StartModal onClose={() => setShowStartModal(false)} />
      )}

      {/* 🟨 終了モーダル */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-xl w-80">

            <h2 className="text-lg font-bold mb-3">
              ⏰ 執筆終了！
            </h2>

            <div className="mb-3 text-sm">
              文字数を入力してください
            </div>

            <input
              type="number"
              value={inputWords}
              onChange={(e) => setInputWords(Number(e.target.value))}
              className="w-full border p-2 rounded mb-4"
            />

            <div className="flex justify-between">

              <button
                onClick={() => setShowFinishModal(false)}
              >
                後で
              </button>

              <button
                onClick={handleSubmitResult}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                送信
              </button>

            </div>

          </div>

        </div>
      )}



{/* 🌟 EXP獲得画面 */}
{showExpScreen && (

<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120]">

  {/* 🎊 CRITICAL紙吹雪 */}
  {isCritical && (
    <Confetti
      className="z-[130]"
      width={window.innerWidth}
      height={window.innerHeight}
      recycle={false}
      numberOfPieces={500}
    />
  )}

  <div
    className="
      bg-gradient-to-br
      from-yellow-100
      to-pink-100
      rounded-3xl
      p-8
      w-[360px]
      text-center
      shadow-2xl
    "
  >

    {/* ブンゴウ */}
{/* ブンゴウ */}
<img
  src={
    isEgg
      ? "/images/bungou/egg.png"
      : species?.image_url
  }
  width={120}
  className={`
    mx-auto mb-4

    ${isCritical
      ? "animate-bounce"
      : "animate-idle"
    }
  `}
/>

    {/* タイトル */}
    <div className="text-2xl font-bold mb-2">
      EXP GET!!
    </div>

    {/* EXP表示 */}
    <div
  className={`
    text-5xl font-black mb-4
    animate-bounce

    ${
      earnedExp >= 2000
        ? "text-red-500 animate-pulse"

        : earnedExp >= 1000
        ? "text-pink-500"

        : "text-yellow-500"
    }
  `}
>
  +{earnedExp} EXP
</div>

    {/* クリティカル */}
    {isCritical && (
      <div className="text-red-500 font-black text-2xl mb-4 animate-bounce">
        CRITICAL!!
      </div>
    )}

    {/* ボタン群 */}
    <div className="flex flex-col gap-3 mt-6">

      {/* 倍獲得 */}
      <button
        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl"
      >
        🎥 EXPを倍もらう
      </button>

{/* 投稿 */}
<button
onClick={openWritingPost}
disabled={isPosted}
className="
bg-blue-500
hover:bg-blue-600
text-white
font-bold
py-3
rounded-xl
"
>

📢 今日の執筆活動を共有する

</button>

      {/* 次へ */}
      <button
        onClick={() => {

          setShowExpScreen(false)

          setShowFinishModal(false)
          setTimer(null)
          setTimeLeft(0)
          setInputWords(0)

          setShowBadgeModal(false)
          setEarnedBadge(null)
          setEarnedBadgesQueue([])
          setBungou(null)
          
          setTimeout(() => {
            fetchBungou()
          }, 0)
        }}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
      >
        ▶ 次へ
      </button>

      {showPostModal && (

<div
className="
fixed
inset-0
bg-black/50
flex
items-center
justify-center
z-50
"
>

<div
className="
bg-white
p-5
rounded-xl
w-80
"
>

<h2 className="font-bold text-lg mb-3">
投稿内容
</h2>


<textarea

value={postText}

onChange={(e)=>
setPostText(e.target.value)
}

className="
w-full
border
rounded-lg
p-3
h-32
"

/>



<div className="
flex
gap-3
mt-4
">


<button

onClick={()=>{
setShowPostModal(false)
}}

className="
flex-1
bg-gray-300
py-2
rounded-lg
"

>

キャンセル

</button>



<button

onClick={submitWritingPost}

className="
flex-1
bg-blue-500
text-white
py-2
rounded-lg
"

>

投稿する

</button>


</div>


</div>

</div>

)}

    </div>

  </div>

</div>

)}

{/* 🌟 進化画面 */}
{showEvolutionScreen && (

<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[130]">

  {/* 🎊 紙吹雪 */}
  <Confetti
    width={window.innerWidth}
    height={window.innerHeight}
    recycle={false}
    numberOfPieces={
      evolutionStage === 3
        ? 700
        : 300
    }
  />

  <div
    className={`
      rounded-3xl
      p-8
      w-[380px]
      text-center
      shadow-2xl

      ${
        evolutionStage === 1
          ? "bg-yellow-100"

        : evolutionStage === 2
          ? "bg-blue-100"

          : "bg-pink-100"
      }
    `}
  >

    {/* タイトル */}
    <div className="text-2xl font-black mb-6 whitespace-pre-line">
      {evolutionTitle}
    </div>

    {/* ブンゴウ画像 */}
    <img
  src={
    evolutionStage === 1
      ? species?.image_url
      : isEgg
        ? "/images/bungou/egg.png"
        : species?.image_url
  }
  width={140}
  className="
    mx-auto
    mb-6
    animate-bounce
  "
/>

    {/* メッセージ */}
    <div className="mb-6 whitespace-pre-line text-gray-700">
      {evolutionMessage}
    </div>

    {/* EXP */}
    <div className="text-4xl font-black mb-6 text-yellow-500">
      +{earnedExp} EXP
    </div>

    {/* ボタン */}
    <div className="flex flex-col gap-3">

      <button
        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl"
      >
        🎥 EXPを倍もらう
      </button>

      <button
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl"
      >
        📢 今日の執筆活動を共有する
      </button>

      <button
        onClick={() => {

          setShowEvolutionScreen(false)

          setShowFinishModal(false)
          setTimer(null)
          setTimeLeft(0)
          setInputWords(0)

          setBungou(null)
          setShowBadgeModal(false)
          setEarnedBadge(null)
          setEarnedBadgesQueue([])
fetchBungou()
        }}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
      >
        ▶ 次へ
      </button>

    </div>

  </div>

</div>
)}

{showBadgeModal && earnedBadge && (

<div className="
fixed inset-0
bg-black/70
flex
items-center
justify-center
z-[200]
">

  <div
    className="
      bg-white
      rounded-3xl
      p-8
      w-[360px]
      text-center
      shadow-2xl
    "
  >

    <div className="text-5xl mb-4">
      🏆
    </div>

    <div className="text-sm text-gray-500">
      BADGE UNLOCKED
    </div>

    <div className="text-4xl mb-4">
      {earnedBadge.icon}
    </div>

    <div className="text-2xl font-black mb-2">
      {earnedBadge.name}
    </div>

    <div
      className="
        inline-block
        bg-yellow-100
        text-yellow-800
        px-3
        py-1
        rounded-full
        text-sm
        font-bold
        mb-4
      "
    >
      {earnedBadge.rarity}
    </div>

    <div className="text-gray-600 mb-6">
      {earnedBadge.description}
    </div>

    <button
onClick={() => {
  const nextQueue = [...earnedBadgesQueue]
  nextQueue.shift() // 今のバッジを削除

  if (nextQueue.length > 0) {
    setEarnedBadgesQueue(nextQueue)
    setEarnedBadge(nextQueue[0])
    setShowBadgeModal(true) // 次を表示
  } else {
    setEarnedBadgesQueue([])
    setEarnedBadge(null)
    setShowBadgeModal(false)
  }

  setNextModal(null)
}}
      className="
        bg-blue-500
        text-white
        px-6
        py-2
        rounded-xl
      "
    >
      閉じる
    </button>

  </div>

</div>

)}
    </div>
  )
}
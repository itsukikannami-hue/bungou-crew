"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import StartModal from "@/components/StartModal"
import Link from "next/link"
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

  const [userItems, setUserItems] = useState([])
  const [todayStats, setTodayStats] = useState({ words: 0, minutes: 0 })

  const fetchTodayStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date()
    const todayJst = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now)
    const start = new Date(`${todayJst}T00:00:00+09:00`)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    const { data, error } = await supabase.from("writing_logs")
      .select("words,minutes")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
    if (error) {
      console.error("本日の執筆記録取得エラー:", error)
      return
    }
    setTodayStats((data || []).reduce((total, log) => ({
      words: total.words + Number(log.words || 0),
      minutes: total.minutes + Number(log.minutes || 0)
    }), { words: 0, minutes: 0 }))
  }

  const useItem = async (
    itemId,
    recoveryDate = null
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
  
      if (!user) {
        alert("ログインが必要です。")
        return
      }
  
      const response = await fetch(
        "/api/items/use",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            itemId,
            recoveryDate,
          }),
        }
      )
  
      const result = await response.json()
  
      if (!response.ok) {
        alert(
          result.error ||
          "アイテムの使用に失敗しました。"
        )
        return
      }
  
      console.log(
        "ITEM USE SUCCESS:",
        result
      )
  
      setShowRecoveryModal(false)
      setSelectedRecoveryDate("")
  
      alert(
        result.message ||
        "アイテムを使用しました。"
      )
  
    } catch (error) {
      console.error(
        "USE ITEM ERROR:",
        error
      )
  
      alert(
        "アイテム使用処理に失敗しました。"
      )
    }
  }

  const [bungou, setBungou] = useState(null)

  const [showInfo, setShowInfo] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)

  const [timer, setTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerReady, setTimerReady] = useState(false)
  const submittingRef = useRef(false)
  const TIMER_KEY = "bungou_writing_timer_v1"

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
  const [postingShare, setPostingShare] = useState(false)
  const [lastWritingLogId, setLastWritingLogId] = useState(null)

  const [showPostModal,setShowPostModal] = useState(false)
const [postText,setPostText] = useState("")

const [sharing, setSharing] = useState(false)
const [isXRewarded, setIsXRewarded] = useState(false)

const createWritingShareText = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("ログイン情報を取得できませんでした")

  const { data: logs, error: logsError } = await supabase
    .from("writing_logs")
    .select("words")
    .eq("user_id", user.id)

  if (logsError) throw logsError

  const totalWords = (logs ?? []).reduce(
    (sum, row) => sum + Number(row.words ?? 0), 0
  )

  return `✍️ 今日は${inputWords.toLocaleString("ja-JP")}文字書きました！\n累計${totalWords.toLocaleString("ja-JP")}文字\n#ブンゴウクルー`
}

const shareWritingToX = async () => {
  if (sharing) return
  if (!lastWritingLogId) {
    alert("執筆記録を確認できません。再度執筆を完了してください。")
    return
  }

  // クリック直後にタブを開き、非同期処理によるポップアップブロックを防ぐ。
  const popup = window.open("about:blank", "_blank")
  if (!popup) {
    alert("ポップアップがブロックされました。ブラウザでポップアップを許可して再度お試しください。")
    return
  }
  setSharing(true)
  try {
    const text = await createWritingShareText()
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    popup.location.replace(intentUrl)

    // 無料方式では投稿完了を検証できないため、X投稿画面を開いた時点で付与。
    // Supabase側のユニーク制約により、同じ執筆記録での二重付与は不可。
    if (!isXRewarded) {
      const { error } = await supabase.rpc("reward_x_share_intent", {
        p_writing_log_id: lastWritingLogId,
      })
      if (error) {
        if (error.code === "23505") {
          setIsXRewarded(true)
          alert("Xの投稿画面を開きました。この執筆記録の10ポイントは付与済みです。")
        } else {
          console.error("X共有ポイント付与エラー:", error)
          alert(`Xの投稿画面を開きましたが、ポイント付与に失敗しました。\n${error.message}`)
        }
      } else {
        setIsXRewarded(true)
        alert("Xの投稿画面を開きました！ 10ポイント獲得！")
      }
    }
  } catch (error) {
    popup.close()
    console.error("X共有画面の起動エラー:", error)
    alert("Xの共有画面を開けませんでした。もう一度お試しください。")
  } finally {
    setSharing(false)
  }
}

const [showRecoveryModal, setShowRecoveryModal] = useState(false)
const [selectedRecoveryDate, setSelectedRecoveryDate] = useState("")

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

  const submitWritingPost = async () => {
    if (postingShare || isPosted) return
    if (!postText.trim()) {
      alert("投稿内容を入力してください")
      return
    }
    if (!lastWritingLogId) {
      alert("執筆記録を確認できません。再度執筆を完了してください。")
      return
    }

    setPostingShare(true)
    try {
      const { error } = await supabase.rpc("share_writing_in_bungou", {
        p_writing_log_id: lastWritingLogId,
        p_content: postText.trim(),
      })
      if (error) {
        console.error("共有RPCエラー詳細:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
      
        alert(
          `共有エラー\n\n` +
          `コード: ${error.code || "不明"}\n` +
          `内容: ${error.message || "不明"}\n` +
          `詳細: ${error.details || "なし"}`
        )
      
        return
      }
      setShowPostModal(false)
      setIsPosted(true)
      alert("ブンゴウクルー内に共有しました！ 5ポイント獲得！")
    } catch (error) {
      console.error("執筆結果の共有エラー:", error)
    
      const message =
        error instanceof Error
          ? error.message
          : String(error)
    
      alert(`共有に失敗しました。\n\n${message}`)
    } finally {
      setPostingShare(false)
    }
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


  const fetchUserItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
  
      if (!user) {
        setUserItems([])
        return
      }
  
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          id,
          user_id,
          item_id,
          quantity,
          obtained_at,
          expires_at,
          items (
            id,
            name,
            type,
            effect_type,
            effect_value,
            duration,
            price,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .gt("quantity", 0)
  
      if (error) {
        console.error(
          "所持アイテム取得エラー:",
          error
        )
  
        setUserItems([])
        return
      }
  
      console.log(
        "所持アイテム:",
        data
      )
  
      setUserItems(data || [])
    } catch (error) {
      console.error(
        "所持アイテム取得エラー:",
        error
      )
  
      setUserItems([])
    }
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
    fetchUserItems()
    fetchTodayStats()
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
  // ⏱ 終了予定時刻を保存。ページ移動・再読み込み後も復元する。
  // 保存形式: { userId, minutes, bungouId, endAt, status }
  // status は running / finished / submitted。
  // =========================
  useEffect(() => {
    let active = true
    const restore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      try {
        const raw = localStorage.getItem(TIMER_KEY)
        if (!raw) return
        const saved = JSON.parse(raw)
        if (!user || saved.userId !== user.id || saved.status === "submitted") return
        if (!Number.isInteger(saved.minutes) || saved.minutes < 1 || saved.minutes > 1440 ||
            typeof saved.bungouId !== "string" || !Number.isFinite(saved.endAt)) {
          localStorage.removeItem(TIMER_KEY)
          return
        }
        setTimer({ minutes: saved.minutes, bungouId: saved.bungouId, endAt: saved.endAt, useExpBoost: saved.useExpBoost === true })
        const remaining = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000))
        setTimeLeft(remaining)
        if (saved.status === "finished" || remaining === 0) {
          localStorage.setItem(TIMER_KEY, JSON.stringify({ ...saved, status: "finished" }))
          setShowFinishModal(true)
        }
      } catch (error) {
        console.error("タイマーの復元に失敗しました:", error)
      } finally {
        if (active) setTimerReady(true)
      }
    }
    restore().then(() => { if (active) setTimerReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const onStart = async (event) => {
      const { minutes, bungouId, useExpBoost } = event.detail || {}
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !bungouId) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const endAt = Date.now() + minutes * 60 * 1000
      const saved = { userId: user.id, minutes, bungouId, endAt, useExpBoost: useExpBoost === true, status: "running" }
      localStorage.setItem(TIMER_KEY, JSON.stringify(saved))
      setTimer({ minutes, bungouId, endAt, useExpBoost: useExpBoost === true })
      setTimeLeft(minutes * 60)
      setShowFinishModal(false)
    }
    window.addEventListener("bungou:timer-start", onStart)
    return () => window.removeEventListener("bungou:timer-start", onStart)
  }, [])

  useEffect(() => {
    if (!timer?.endAt || !timerReady || showFinishModal) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        try {
          const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null")
          if (saved && saved.endAt === timer.endAt && saved.status === "running") {
            localStorage.setItem(TIMER_KEY, JSON.stringify({ ...saved, status: "finished" }))
          }
        } catch (error) { console.error("タイマー保存エラー:", error) }
        setShowFinishModal(true)
      }
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [timer, timerReady, showFinishModal])

  const clearSavedTimer = () => {
    localStorage.removeItem(TIMER_KEY)
    setTimer(null)
    setTimeLeft(0)
  }

  // =========================
  // =========================
  // 🎯 EXP処理（変更なし）
  // =========================
  const handleSubmitResult = async () => {
    if (submittingRef.current || !timer || !bungou) return
    submittingRef.current = true
    try {
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
  
  // =========================
  // EXP基本値
  // =========================
  const baseExp = words + minutes * 5
  
  // =========================
  // ✨ EXPブースト確認
  // =========================
  const { data: expBoostItem, error: expBoostItemError } = await supabase
    .from("items")
    .select("id, name, effect_type, effect_value")
    .eq("effect_type", "EXP_MULTIPLIER")
    .eq("effect_value", 2)
    .eq("is_active", true)
    .maybeSingle()
  
  if (expBoostItemError) {
    console.error("EXPブースト取得エラー:", expBoostItemError)
  }
  
  let expGain = baseExp
  let usedExpBoost = false
  
  if (timer.useExpBoost === true && expBoostItem) {
  
    const { data: ownedExpBoost, error: ownedExpBoostError } =
      await supabase
        .from("user_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("item_id", expBoostItem.id)
        .gt("quantity", 0)
        .maybeSingle()
  
    if (ownedExpBoostError) {
      console.error("EXPブースト所持確認エラー:", ownedExpBoostError)
    }
  
    if (ownedExpBoost) {
      console.log("🔥 EXPブースト所持状態:", {
        id: ownedExpBoost.id,
        quantity: ownedExpBoost.quantity,
        itemId: expBoostItem.id,
      })
    
      const newQuantity = ownedExpBoost.quantity - 1
  
      if (newQuantity > 0) {

        const { data: updatedItem, error } = await supabase
          .from("user_items")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq("id", ownedExpBoost.id)
          .select()
      
        console.log("🔄 EXPブースト数量更新結果:", {
          updatedItem,
          error
        })
      
        if (error) {
          console.error("EXPブースト消費エラー:", error)
          return
        }
      
        if (!updatedItem || updatedItem.length === 0) {
          console.error(
            "❌ EXPブースト数量が更新されていません。RLSを確認してください。"
          )
          return
        }
      } else {

        const { data: deletedItem, error } = await supabase
          .from("user_items")
          .delete()
          .eq("id", ownedExpBoost.id)
          .select()
      
        console.log("🗑️ EXPブースト削除結果:", {
          deletedItem,
          error
        })
      
        if (error) {
          console.error("EXPブースト削除エラー:", error)
          return
        }
      
        if (!deletedItem || deletedItem.length === 0) {
          console.error(
            "❌ EXPブーストがDBから削除されていません。RLSを確認してください。"
          )
          return
        }
      
        console.log("✅ EXPブーストを1個消費しました")
      }
  
      // EXPを2倍
      expGain = baseExp * 2
  
      usedExpBoost = true
  
      console.log("✨ EXPブースト使用")
      console.log("通常EXP:", baseExp)
      console.log("ブースト後EXP:", expGain)
      console.log("残り個数:", newQuantity)
    }
  }

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
    
    const { data: savedWritingLog, error: writingLogError } = await supabase
      .from("writing_logs")
      .insert({
        user_id: user.id,
        words,
        minutes,
        words_per_minute: wordsPerMinute,
        hour_bucket: hourBucket
      })
      .select("id")
      .single()

    if (writingLogError || !savedWritingLog?.id) {
      throw writingLogError || new Error("執筆記録の保存に失敗しました")
    }
    setLastWritingLogId(savedWritingLog.id)
    setIsPosted(false)
    setIsXRewarded(false)
    await fetchTodayStats()


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
          `おめでとう！${species?.name} がセミプロに成長したよ！`
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
          `おめでとう！${species?.name} は見事小説家としてのデビューを果たした！`
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
    // 処理完了後は再読み込みで二重付与しない。
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null")
    if (saved) localStorage.setItem(TIMER_KEY, JSON.stringify({ ...saved, status: "submitted" }))
    } finally { submittingRef.current = false }
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

// =========================
// 🖼️ 成長段階ごとのブンゴウ画像
// =========================
const getBungouImage = (targetStage) => {
  if (targetStage >= 3) {
    return (
      species?.debut_image_url ||
      species?.semi_pro_image_url ||
      species?.image_url ||
      "/images/bungou/egg.png"
    )
  }

  if (targetStage >= 2) {
    return (
      species?.semi_pro_image_url ||
      species?.image_url ||
      "/images/bungou/egg.png"
    )
  }

  if (targetStage >= 1) {
    return species?.image_url || "/images/bungou/egg.png"
  }

  return "/images/bungou/egg.png"
}

const currentBungouImage = getBungouImage(stage)

const currentStage = bungou?.stage || 0
const currentExp = bungou?.exp || 0

const EXP_TABLE = {
  0: 5000,
  1: 12500,
  2: 22500,
}

const nextExp = EXP_TABLE[currentStage] ?? 10000
const remainingExp = Math.max(nextExp - currentExp, 0)
// 画面に表示する「現在EXP / 次の成長に必要な累計EXP」と同じ基準で計算する。
// デビュー済みの場合は成長バーを満タンにする。
const expProgress = currentStage >= 3
  ? 100
  : Math.min(100, Math.max(0, (currentExp / Math.max(1, nextExp)) * 100))

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 text-[#775b45]">
      <section className="rounded-3xl border border-[#f2e3d2] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="mb-2 text-center text-xl font-bold">今日も一緒に執筆しよう！</h2>
        <p className="mb-4 text-center text-sm text-[#927b69]">{isEgg ? "新しい物語を育てよう" : species?.name}</p>
        <div className="relative mx-auto h-64 w-full max-w-lg overflow-hidden rounded-2xl bg-[#fff9f0] sm:h-72">

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
  src={currentBungouImage}
  width={112}
  alt={species?.name || "ブンゴウ"}
  className={`
  transition-transform duration-500

  ${isIdle ? "animate-idle" : ""}

  ${isWalking ? "animate-walk" : ""}

  ${isFacingRight ? "-scale-x-100" : ""}
  `}
/>
        </div>
      )}

        </div>
        <button
          onClick={() => {
            if (timer) {
              if (timeLeft === 0) setShowFinishModal(true)
              else alert("執筆タイマーが進行中です。終了するまでお待ちください。")
              return
            }
            setShowStartModal(true)
          }}
          className="mt-5 w-full rounded-2xl bg-[#efa76d] px-6 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#df965a]"
        >
          執筆を始める
        </button>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#fff6ec] p-4 text-center">
            <p className="text-sm text-[#927b69]">今日の文字数</p>
            <p className="mt-1 text-xl font-bold">{todayStats.words.toLocaleString()} <span className="text-sm font-normal">文字</span></p>
          </div>
          <div className="rounded-2xl bg-[#fff6ec] p-4 text-center">
            <p className="text-sm text-[#927b69]">今日の執筆時間</p>
            <p className="mt-1 text-xl font-bold">{todayStats.minutes.toLocaleString()} <span className="text-sm font-normal">分</span></p>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">成長 EXP</span>
            <span className="text-[#927b69]">{currentStage >= 3 ? "デビュー" : `${currentExp.toLocaleString()} / ${nextExp.toLocaleString()}`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#f5e8d9]">
            <div className="h-full rounded-full bg-[#efa76d] transition-all" style={{ width: `${expProgress}%` }} />
          </div>
        </div>
      </section>
      <button
        onClick={() => {
          setSelectedRecoveryDate("")
          setShowRecoveryModal(true)
        }}
        className="w-full rounded-xl border border-[#e8c5a5] bg-white px-4 py-3 text-sm font-semibold text-[#a47754] hover:bg-[#fff9f0]"
      >
        習慣リカバリーを使う
      </button>

      {/* ⏱ タイマー */}
      {timer && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white shadow-lg px-6 py-3 rounded-xl text-lg font-bold z-50">
          ⏱ 残り時間：
          {Math.floor(timeLeft / 60)}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {/* 📊 情報パネル */}
      {showInfo && (
        <div className="fixed left-1/2 top-1/3 z-40 w-64 -translate-x-1/2 rounded-xl border border-[#f2deca] bg-white p-4 text-sm shadow-lg">

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
<img
  src={currentBungouImage}
  width={120}
  alt={species?.name || "ブンゴウ"}
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

    {/* アプリ内共有のポイント案内と無料のX共有 */}
    <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-left">
      <p className="text-center text-sm font-bold text-amber-900">
        🎁 執筆結果を共有してポイントGET！
      </p>
      <div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-[#775b45]">
        <p>📢 ブンゴウクルー内で共有：+5pt</p>
        <p>𝕏 Xで共有画面を開く：+10pt（1執筆につき1回）</p>
      </div>
      <p className="mt-2 text-xs text-[#9d7656]">
        ※ アプリ内共有は投稿完了で5pt。Xは投稿画面を開いた時点で10pt付与します（投稿完了は未確認）。
      </p>
    </div>

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

📢 ブンゴウクルー内で共有（+5pt）

</button>

      {/* 無料のX投稿画面を開き、同じ執筆記録につき一度だけ10pt付与 */}
      <button
        type="button"
        onClick={shareWritingToX}
        disabled={sharing}
        className="rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {sharing ? "Xの投稿画面を準備中..." : "𝕏 Xで共有（+10pt・無料）"}
      </button>


      {/* 次へ */}
      <button
        onClick={() => {

          setShowExpScreen(false)

          setShowFinishModal(false)
          clearSavedTimer()
          setInputWords(0)
          setLastWritingLogId(null)
          setIsXRewarded(false)

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
disabled={postingShare || isPosted}

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
  src={getBungouImage(evolutionStage)}
  width={140}
  alt={`${species?.name || "ブンゴウ"}の進化後の姿`}
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

    {/* 成長によって解放された図鑑プロフィールへの導線 */}
    {bungou?.species_id && (
      <div className="mb-5 rounded-2xl border border-[#ead5b7] bg-white/80 px-4 py-4 text-[#694b38]">
        <p className="text-sm font-bold">
          {evolutionStage === 1
            ? "📖 ブンゴウ図鑑にプロフィールが登録されました！"
            : evolutionStage === 2
              ? "📖 図鑑のセミプロ期プロフィールが解放されました！"
              : "📖 図鑑のデビュー期プロフィールが解放されました！"}
        </p>
        <p className="mt-2 text-xs text-[#907b68]">成長したブンゴウの情報を確認できます。</p>
        <Link
          href={`/album/${bungou.species_id}`}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#d78f57] px-5 py-2 text-sm font-bold text-white hover:bg-[#c58049]"
        >
          解放されたプロフィールを見る →
        </Link>
      </div>
    )}

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
          clearSavedTimer()
          setInputWords(0)
          setLastWritingLogId(null)
          setIsXRewarded(false)

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

{showRecoveryModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">

    <div className="bg-white rounded-2xl p-6 w-[350px] shadow-2xl">

      <h2 className="text-xl font-bold mb-4">
        🔄 習慣リカバリー
      </h2>

      <p className="text-sm text-gray-600 mb-4">
        復旧したい日を選択してください。
      </p>

      <input
        type="date"
        value={selectedRecoveryDate}
        onChange={(e) =>
          setSelectedRecoveryDate(e.target.value)
        }
        className="w-full border rounded-lg p-3 mb-5"
      />

      <div className="flex gap-3">

        <button
          onClick={() => {
            setShowRecoveryModal(false)
            setSelectedRecoveryDate("")
          }}
          className="flex-1 bg-gray-300 py-2 rounded-lg"
        >
          キャンセル
        </button>

        <button
          onClick={() => {
            if (!selectedRecoveryDate) {
              alert("復旧する日を選択してください。")
              return
            }

            useItem(
              "e98e579f-67c7-4e24-9b9b-7c21fca772d7",
              selectedRecoveryDate
            )
          }}
          className="flex-1 bg-purple-500 text-white py-2 rounded-lg"
        >
          この日を復旧する
        </button>

      </div>

    </div>

  </div>
)}
    </div>
  )

  
}
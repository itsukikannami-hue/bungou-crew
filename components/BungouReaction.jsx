"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./BungouReaction.module.css"

const TAP_MESSAGES = [
  "なあに？",
  "今日も一緒に書こう！",
  "応援してるよ！",
  "えへへ♪",
  "いい物語になりそう！",
  "次はどんなお話？",
  "ひらめきが来るかも！",
  "ちょっと休憩する？",
  "一文字ずつ進もう！",
  "君の物語、楽しみ！",
  "焦らなくても大丈夫！",
  "新しい世界を見せて！",
  "ここで待ってるよ！",
  "書きたい気持ちを大切に！",
  "今日はどんな気分？",
  "続きが気になるなあ！",
  "小さな一歩も大切！",
  "一緒ならきっと書ける！",
  "ふふ、くすぐったい！",
  "物語の種を探そう！",
]
const EGG_MESSAGES = [
  "もうすぐ会えるかな？",
  "コツコツ育ててね！",
  "こんこん…♪",
  "中から声が聞こえる？",
  "あと少し、あと少し！",
  "どんな姿になるかな？",
  "物語の力を感じるよ！",
  "ぽかぽかするね！",
  "ここにいるよ！",
  "トントン、聞こえる？",
  "書くたびに育ってるよ！",
  "孵化が楽しみだね！",
  "今日も見守ってね！",
  "少しずつ大きくなるよ！",
  "一緒にがんばろう！",
]
const CLICK_STREAK_RESET_MS = 10_000 // 10秒間クリックがなければ連打カウントをリセット

const COMPLETE_MESSAGES = [
  "執筆おつかれさま！",
  "今日も書けたね！",
  "すごい！ がんばったね！",
  "また一歩進んだね！",
  "物語が育ってるよ！",
  "続けていてえらい！",
  "今日の積み重ねが力になる！",
  "いい時間だったね！",
  "書き終えた達成感！",
  "次の執筆も楽しみ！",
  "一緒にがんばれたね！",
  "おつかれ、ひと休みしよう！",
  "素敵な一歩をありがとう！",
  "書くって楽しいね！",
  "今日の自分に拍手！",
]

/**
 * ブンゴウ表示領域に重ねる、見た目だけのリアクション。
 * DB更新・EXP付与・クリックイベントの横取りはしません。
 */
export default function BungouReaction({ trigger = 0, tapTrigger = 0, isEgg = false }) {
  const [reaction, setReaction] = useState(null)
  const timeoutRef = useRef(null)
  const lastTriggerRef = useRef(trigger)
  const lastTapRef = useRef(tapTrigger)
  const lastIndexRef = useRef(-1)
  const clickStreakRef = useRef(0)
  const lastClickAtRef = useRef(0)

  const showReaction = (kind, forcedMessage = null) => {
    const messages = kind === "complete"
      ? COMPLETE_MESSAGES
      : (isEgg ? EGG_MESSAGES : TAP_MESSAGES)
    let index = Math.floor(Math.random() * messages.length)
    if (messages.length > 1 && index === lastIndexRef.current) index = (index + 1) % messages.length
    lastIndexRef.current = index
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setReaction({ kind, message: forcedMessage ?? messages[index], id: Date.now() })
    timeoutRef.current = setTimeout(() => setReaction(null), 2300)
  }

  useEffect(() => {
    if (lastTriggerRef.current !== trigger && trigger > 0) {
      showReaction("complete")
    }
    lastTriggerRef.current = trigger
    // triggerの変更時のみ発火。タップは親から独立して呼ぶ。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useEffect(() => {
    if (lastTapRef.current !== tapTrigger && tapTrigger > 0) {
      const now = Date.now()
      if (now - lastClickAtRef.current > CLICK_STREAK_RESET_MS) {
        clickStreakRef.current = 0
      }
      // 親コンポーネントのクリック回数がまとめて増えても正しく数える
      clickStreakRef.current += Math.max(1, tapTrigger - lastTapRef.current)
      lastClickAtRef.current = now

      const count = clickStreakRef.current
      const forcedMessage = count > 100
        ? "…。"
        : count > 50
          ? "そろそろ執筆したら？"
          : count >= 30
            ? "ねえ、どうしたの？"
            : null
      showReaction("tap", forcedMessage)
    }
    lastTapRef.current = tapTrigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapTrigger])

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return (
    <div className={styles.layer} aria-live="polite" aria-atomic="true">
      {reaction && (
        <div key={reaction.id} className={`${styles.bubble} ${reaction.kind === "complete" ? styles.complete : ""}`}>
          <span className={styles.sparkle} aria-hidden="true">{reaction.kind === "complete" ? "✨" : "♡"}</span>
          {reaction.message}
        </div>
      )}
    </div>
  )
}

export function useBungouReaction() {
  const [trigger, setTrigger] = useState(0)
  const [tapTrigger, setTapTrigger] = useState(0)
  return {
    trigger,
    tapTrigger,
    reactToWriting: () => setTrigger((n) => n + 1),
    reactToTap: () => setTapTrigger((n) => n + 1),
  }
}

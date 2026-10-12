"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

type TutorialModalProps = {
  onComplete: () => Promise<void> | void
  onSkip: () => Promise<void> | void
}

type Step = {
  eyebrow: string
  title: string
  description: string
  guide: string
  visual: "welcome" | "write" | "grow" | "record" | "social" | "collection"
}

const steps: Step[] = [
  {
    eyebrow: "BUNGOU CREW",
    title: "ブンゴウクルーとは？",
    description:
      "ブンゴウクルーは、執筆を記録しながらブンゴウを育て、創作仲間と交流できるサービスです。毎日の創作を「執筆 × 育成 × 交流」の3つの楽しみに変えて、書き続けることを応援します。",
    guide:
      "書いた記録が残って、ぼくたちが育って、創作仲間ともつながれるよ！",
    visual: "welcome",
  },
  {
    eyebrow: "WRITE & GROW",
    title: "書くほどブンゴウが育つ",
    description:
      "執筆すると文字数と時間が記録され、その内容に応じてEXPを獲得できます。EXPが増えると、ブンゴウは「卵 → アマチュア → セミプロ → デビュー」と成長。育てたブンゴウは図鑑にも集められます。",
    guide:
      "あなたが書いた一文字一文字が、ぼくたちの成長につながるよ。いろいろなブンゴウを育てて図鑑を集めよう！",
    visual: "grow",
  },
  {
    eyebrow: "KEEP WRITING & CONNECT",
    title: "執筆を続ける・仲間と交流する",
    description:
      "執筆した文字数や時間は記録として振り返ることができ、達成した条件に応じてバッジも獲得できます。タイムラインでは、投稿・応援・コメント・リポスト・フォローなどを使って創作仲間と交流できます。",
    guide:
      "自分の頑張りを残すだけじゃなく、ほかの創作者の頑張りを応援することもできるよ！",
    visual: "social",
  },
  {
    eyebrow: "QUEST",
    title: "クエストで創作者同士が助け合える",
    description:
      "クエストでは、自分の作品への感想を募集したり、創作仲間からの依頼を手伝ったりできます。作品を読んでもらいたいときも、誰かの創作を応援したいときも利用できます。",
    guide:
      "作品の感想がほしいときは募集してみよう。ほかの人のクエストを手伝うのも創作仲間との新しい出会いになるよ！",
    visual: "record",
  },
  {
    eyebrow: "LET'S WRITE",
    title: "ブンゴウと一緒に、執筆を始めよう！",
    description:
      "執筆を記録して、ブンゴウを育てて、創作仲間と励まし合う。あなたの創作の日々を、ブンゴウクルーと一緒に積み重ねていきましょう。",
    guide:
      "準備はできた？ それでは、最初の執筆を始めてみよう！",
    visual: "collection",
  },
]

const bungouImages = Array.from(
  { length: 15 },
  (_, index) => `/images/tutorial-bungou/bungou_${index + 1}.png`
)

function Character({
  src,
  className = "",
  priority = false,
}: {
  src: string
  className?: string
  priority?: boolean
}) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="180px"
        className="object-contain drop-shadow-[0_10px_18px_rgba(121,82,47,0.14)]"
      />
    </div>
  )
}

function StepVisual({ type }: { type: Step["visual"] }) {
  if (type === "welcome") {
    return (
      <div className="relative h-[245px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#fff0d9] via-[#fff8ec] to-[#fbe7d6] sm:h-[285px]">
        <div className="absolute left-5 top-5 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#b8753e] shadow-sm">
          執筆 × 育成 × 交流
        </div>
        <Character src={bungouImages[0]} className="absolute bottom-3 left-[5%] h-36 w-36 sm:h-44 sm:w-44" priority />
        <Character src={bungouImages[5]} className="absolute bottom-1 left-1/2 h-32 w-32 -translate-x-1/2 sm:h-40 sm:w-40" />
        <Character src={bungouImages[8]} className="absolute bottom-2 right-[4%] h-36 w-36 sm:h-44 sm:w-44" />
        <div className="absolute bottom-3 left-1/2 h-5 w-[80%] -translate-x-1/2 rounded-[50%] bg-[#d9b890]/15 blur-md" />
      </div>
    )
  }

  if (type === "write") {
    return (
      <div className="relative flex h-[245px] items-center justify-center overflow-hidden rounded-[28px] bg-[#fff4e6] sm:h-[285px]">
        <Character src={bungouImages[1]} className="absolute -left-2 bottom-0 h-40 w-40 sm:left-3 sm:h-48 sm:w-48" />
        <div className="ml-12 w-[210px] max-w-[calc(100%-64px)] sm:ml-28 rounded-3xl border border-[#efd7bd] bg-white/95 p-4 shadow-lg sm:ml-28 sm:w-[245px]">
          <p className="text-center text-xs font-bold text-[#b77b4b]">✍️ 執筆中</p>
          <p className="my-3 text-center text-3xl font-black tracking-wider text-[#694b38]">25:14</p>
          <div className="rounded-xl bg-[#c77f43] py-2 text-center text-xs font-bold text-white">執筆を終了する</div>
          <div className="mt-3 flex justify-between rounded-xl bg-[#fff6eb] px-3 py-2 text-[11px] text-[#846a56]">
            <span>今日の記録</span><b>1,240文字</b>
          </div>
        </div>
      </div>
    )
  }

  if (type === "grow") {
    return (
      <div className="relative h-[245px] overflow-hidden rounded-[28px] bg-gradient-to-r from-[#fff4df] to-[#f7edda] px-4 sm:h-[285px]">
        <div className="flex h-full items-center justify-between gap-1">
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-5xl shadow-sm sm:h-24 sm:w-24">🥚</div>
            <span className="mt-2 text-[11px] font-bold text-[#8a684d]">卵</span>
          </div>
          <span className="text-xl text-[#d5a16f]">→</span>
          <div className="flex flex-col items-center">
            <Character src={bungouImages[4]} className="h-24 w-24 sm:h-28 sm:w-28" />
            <span className="mt-1 text-[11px] font-bold text-[#8a684d]">アマチュア</span>
          </div>
          <span className="text-xl text-[#d5a16f]">→</span>
          <div className="flex flex-col items-center">
          <Character
    src="/images/tutorial-bungou/bungou_semipro_5.png"
    className="h-24 w-24 sm:h-28 sm:w-28"
  />            <span className="mt-1 text-[11px] font-bold text-[#8a684d]">セミプロ</span>
          </div>
          <span className="text-xl text-[#d5a16f]">→</span>
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fff1c9] text-4xl shadow-sm sm:h-24 sm:w-24">✨</div>
            <span className="mt-2 text-[11px] font-bold text-[#8a684d]">デビュー</span>
          </div>
        </div>
      </div>
    )
  }

  if (type === "record") {
    return (
      <div className="relative flex h-[245px] items-center justify-center overflow-hidden rounded-[28px] bg-[#fff4e8] sm:h-[285px]">
        <Character src={bungouImages[3]} className="absolute -right-3 bottom-0 h-36 w-36 sm:right-2 sm:h-44 sm:w-44" />
        <div className="mr-12 w-[225px] max-w-[calc(100%-64px)] sm:mr-28 space-y-3 sm:mr-28 sm:w-[270px]">
          <div className="rounded-2xl bg-white p-4 shadow-md">
            <p className="text-[10px] font-black tracking-wider text-[#c77f43]">QUEST</p>
            <p className="mt-1 text-sm font-bold text-[#694b38]">作品の感想を募集しています！</p>
            <p className="mt-2 text-[11px] leading-5 text-[#8c725e]">読んだ感想や、好きだった場面を教えてください。</p>
            <div className="mt-3 rounded-xl bg-[#fff0dc] py-2 text-center text-xs font-bold text-[#a2673c]">クエストを見る</div>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-[#805d43] shadow-sm">
            🤝 感想を募集する　・　依頼を手伝う
          </div>
        </div>
      </div>
    )
  }

  if (type === "social") {
    return (
      <div className="relative flex h-[245px] items-center justify-center overflow-hidden rounded-[28px] bg-[#fff2e6] sm:h-[285px]">
        <Character src={bungouImages[2]} className="absolute -left-3 bottom-0 h-36 w-36 sm:left-2 sm:h-44 sm:w-44" />
        <div className="ml-12 w-[225px] max-w-[calc(100%-64px)] sm:ml-28 rounded-3xl bg-white p-4 shadow-lg sm:ml-28 sm:w-[270px]">
          <div className="flex items-center gap-2">
            <Character src={bungouImages[9]} className="h-10 w-10 rounded-full bg-[#fff3e3]" />
            <div><p className="text-xs font-bold text-[#694b38]">創作仲間</p><p className="text-[10px] text-[#a48a75]">たった今</p></div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6f5948]">今日1,500文字書けました！<br />いいところまで来た ✍️</p>
          <div className="mt-3 flex justify-between border-t border-[#f2e5d8] pt-3 text-xs text-[#a06f49]"><span>📣 12</span><span>💬 3</span><span>🔁 2</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[245px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#fff1df] to-[#f9eadf] sm:h-[285px]">
      <div className="absolute inset-x-3 top-3 grid grid-cols-5 gap-1 sm:inset-x-5 sm:gap-2">
        {bungouImages.slice(0, 15).map((src, index) => (
          <div key={src} className={`relative aspect-square rounded-2xl bg-white/70 p-1 shadow-sm ${index > 9 ? "hidden sm:block" : ""}`}>
            <Image src={src} alt="" fill sizes="80px" className="object-contain p-1" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 w-[88%] -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-bold text-[#805b40] shadow-md">
        📚 図鑑　　🏅 バッジ　　🛍️ アイテム
      </div>
    </div>
  )
}

export default function TutorialModal({ onComplete, onSkip }: TutorialModalProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const current = steps[step]
  const isLast = step === steps.length - 1
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const finish = async (skip = false) => {
    if (saving) return
    setSaving(true)
    try {
      if (skip) await onSkip()
      else await onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#4a3527]/55 px-3 py-3 backdrop-blur-[2px] sm:px-5 sm:py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="relative mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#fffaf4] shadow-2xl sm:min-h-0 sm:rounded-[34px]"
      >
        <div className="h-1.5 w-full bg-[#f1e0cf]">
          <div className="h-full rounded-r-full bg-[#c77f43] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <header className="flex items-center justify-between px-5 pb-3 pt-4 sm:px-8 sm:pt-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-[0.16em] text-[#b36f39]">BUNGOU CREW</span>
            <span className="rounded-full bg-[#f7e7d7] px-2 py-1 text-[10px] font-bold text-[#9b704e]">{step + 1} / {steps.length}</span>
          </div>
          <button type="button" onClick={() => finish(true)} disabled={saving} className="rounded-xl px-3 py-2 text-xs font-bold text-[#9b7a61] hover:bg-[#f7eadc] disabled:opacity-50">スキップ</button>
        </header>

        <div className="flex flex-1 flex-col px-4 pb-5 sm:px-8 sm:pb-7">
          <StepVisual type={current.visual} />

          <div className="mx-auto mt-5 w-full max-w-[620px] text-center sm:mt-6">
            <p className="text-[11px] font-black tracking-[0.2em] text-[#c77f43]">{current.eyebrow}</p>
            <h2 id="tutorial-title" className="mt-2 text-[22px] font-black leading-[1.45] text-[#604331] sm:text-3xl">{current.title}</h2>
            <p className="mx-auto mt-3 max-w-[580px] text-sm leading-7 text-[#7f6755] sm:text-[15px]">{current.description}</p>

            <div className="mx-auto mt-4 flex max-w-[560px] items-center gap-3 rounded-2xl bg-[#fff0dc] px-4 py-3 text-left">
              <Character src={bungouImages[(step * 2 + 6) % bungouImages.length]} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
              <p className="text-xs font-medium leading-6 text-[#805d43] sm:text-sm">「{current.guide}」</p>
            </div>
          </div>

          <div className="mt-auto pt-5 sm:pt-6">
            <div className="mb-4 flex justify-center gap-2">
              {steps.map((_, index) => (
                <span key={index} className={`h-2 rounded-full transition-all ${index === step ? "w-7 bg-[#c77f43]" : index < step ? "w-2 bg-[#d9ad86]" : "w-2 bg-[#ead9c9]"}`} />
              ))}
            </div>

            <div className="mx-auto flex w-full max-w-[560px] gap-3">
              <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving} className="min-h-12 flex-1 rounded-2xl border border-[#e5c9ae] bg-white px-4 py-3 text-sm font-bold text-[#84654d] transition hover:bg-[#fff5e9] disabled:cursor-not-allowed disabled:opacity-35">戻る</button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) void finish(false)
                  else setStep((s) => s + 1)
                }}
                disabled={saving}
                className="min-h-12 flex-[1.6] rounded-2xl bg-[#c77f43] px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#b86e34] disabled:opacity-60"
              >
                {saving ? "保存中..." : isLast ? "✍️ 最初の執筆を始める" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

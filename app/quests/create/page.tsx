"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type QuestType = {
  id: string
  name: string
  description: string | null
  reward_type: "fixed" | "custom"
  min_reward: number
  fixed_reward: number | null
  is_active: boolean
}

export default function QuestCreatePage() {
  const router = useRouter()

  const [questTypes, setQuestTypes] = useState<QuestType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [questTypeId, setQuestTypeId] = useState("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const [rewardPerPerson, setRewardPerPerson] = useState("")

  const [maxParticipants, setMaxParticipants] = useState("1")

  const [deadline, setDeadline] = useState("")

  const [targetUrl, setTargetUrl] = useState("")

  // クエスト種類取得
  useEffect(() => {
    const fetchQuestTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("quest_types")
          .select(`
            id,
            name,
            description,
            reward_type,
            min_reward,
            fixed_reward,
            is_active
          `)
          .eq("is_active", true)
          .order("name")

        if (error) {
          console.error("クエスト種類取得エラー:", error)
          return
        }


        setQuestTypes(data ?? [])

        if (data && data.length > 0) {
          setQuestTypeId(data[0].id)
          setRewardPerPerson(String(data[0].reward_type === "fixed" ? (data[0].fixed_reward ?? data[0].min_reward) : data[0].min_reward))
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestTypes()
  }, [])

  const selectedQuestType = questTypes.find(
    (type) => type.id === questTypeId
  )

  // クエスト種類変更
  const handleQuestTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const id = e.target.value

    setQuestTypeId(id)

    const selected = questTypes.find(
      (type) => type.id === id
    )

    if (!selected) {
      setRewardPerPerson("")
      return
    }

    if (selected.reward_type === "fixed") {
      setRewardPerPerson(
        String(selected.fixed_reward ?? selected.min_reward)
      )
    } else {
      setRewardPerPerson(
        String(selected.min_reward)
      )
    }
  }

  // 作成ボタン
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (submitting) return

    if (!questTypeId) {
      alert("クエスト種類を選択してください。")
      return
    }

    if (!title.trim()) {
      alert("クエストタイトルを入力してください。")
      return
    }

    if (!description.trim()) {
      alert("依頼内容を入力してください。")
      return
    }

    if (!rewardPerPerson) {
      alert("報酬を入力してください。")
      return
    }

    const reward = Number(rewardPerPerson)

    if (!Number.isInteger(reward) || reward <= 0) {
      alert("報酬は1以上の整数で入力してください。")
      return
    }

    if (selectedQuestType) {
      if (reward < selectedQuestType.min_reward) {
        alert(
          `このクエストの報酬は${selectedQuestType.min_reward.toLocaleString()}pt以上です。`
        )
        return
      }

      if (
        selectedQuestType.reward_type === "fixed" &&
        reward !== selectedQuestType.fixed_reward
      ) {
        alert(
          `このクエストの報酬は${selectedQuestType.fixed_reward?.toLocaleString()}ptです。`
        )
        return
      }
    }

    const participants = Number(maxParticipants)

    if (
      !Number.isInteger(participants) ||
      participants < 1
    ) {
      alert("募集人数は1人以上にしてください。")
      return
    }

    if (!deadline) {
      alert("締切日時を設定してください。")
      return
    }

    const deadlineDate = new Date(deadline)

    if (Number.isNaN(deadlineDate.getTime())) {
      alert("正しい締切日時を入力してください。")
      return
    }

    if (deadlineDate <= new Date()) {
      alert("締切日時は現在より後にしてください。")
      return
    }

    if (targetUrl.trim()) {
      try {
        new URL(targetUrl.trim())
      } catch {
        alert("作品ページURLが正しくありません。")
        return
      }
    }

    try {
      setSubmitting(true)
    
      const { data, error } = await supabase.rpc(
        "create_quest",
        {
          p_quest_type_id: questTypeId,
          p_title: title.trim(),
          p_description: description.trim(),
          p_reward_per_person: reward,
          p_max_participants: participants,
          p_deadline: deadlineDate.toISOString(),
          p_target_url: targetUrl.trim() || null,
        }
      )
    
      if (error) {
        console.error("クエスト作成エラー:", error)
        alert(error.message)
        return
      }
    
      console.log("クエスト作成結果:", data)
    
      alert("クエストを作成しました！")
    
      router.push(`/quests/${data.quest_id}`)
    } finally {
      setSubmitting(false)
    }
  }

  const totalPoints = (Number(rewardPerPerson) || 0) * (Number(maxParticipants) || 0)
  const fieldClass = "mt-2 w-full rounded-2xl border border-[#ead8c6] bg-[#fffdf9] px-4 py-3 text-[#594535] outline-none transition placeholder:text-[#b9a99b] focus:border-[#e5a16a] focus:ring-2 focus:ring-[#f9e5d3]"
  const cardClass = "rounded-[24px] border border-[#f0dfce] bg-white p-5 shadow-[0_4px_20px_rgba(122,80,42,0.05)] sm:p-7"

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf2] px-4 py-10 text-[#594535]">
        <p className="mx-auto max-w-3xl text-center text-sm text-[#9d8571]">クエスト種類を読み込んでいます...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-7 text-[#594535] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#a57b59] hover:text-[#cf8951]">
          <span aria-hidden="true">←</span> 戻る
        </button>

        <div className="mb-7">
          <span className="inline-block rounded-full bg-[#ffecda] px-3 py-1 text-xs font-bold text-[#bd7b47]">新しい依頼</span>
          <h1 className="mt-3 text-2xl font-bold tracking-wide text-[#604735] sm:text-3xl">クエストを作成</h1>
          <p className="mt-2 text-sm leading-7 text-[#967d69]">作品を通じて、ほかの書き手とつながる依頼を作成しましょう。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e1] text-sm font-bold text-[#cb8853]">01</span>
              <h2 className="text-lg font-bold">クエストの種類</h2>
            </div>
            <label htmlFor="quest-type" className="block text-sm font-semibold">依頼の種類</label>
            <select id="quest-type" value={questTypeId} onChange={handleQuestTypeChange} className={fieldClass}>
              {questTypes.length === 0 && <option value="">選択できる種類がありません</option>}
              {questTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            {selectedQuestType?.description && (
              <p className="mt-3 rounded-xl bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#957b66]">{selectedQuestType.description}</p>
            )}
          </section>

          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e1] text-sm font-bold text-[#cb8853]">02</span>
              <h2 className="text-lg font-bold">依頼内容</h2>
            </div>
            <div>
              <label htmlFor="quest-title" className="block text-sm font-semibold">クエストタイトル <span className="text-[#d88e56]">*</span></label>
              <input id="quest-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="例：小説○○の第1話を読んで感想をください" className={fieldClass} />
              <p className="mt-2 text-right text-xs text-[#ad9886]">{title.length}/100</p>
            </div>
            <div className="mt-5">
              <label htmlFor="quest-description" className="block text-sm font-semibold">お願いしたいこと <span className="text-[#d88e56]">*</span></label>
              <textarea id="quest-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={7} maxLength={5000} placeholder="どのようなことをしてほしいか、具体的に書いてください。" className={fieldClass} />
              <p className="mt-2 text-right text-xs text-[#ad9886]">{description.length}/5000</p>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e1] text-sm font-bold text-[#cb8853]">03</span>
              <h2 className="text-lg font-bold">報酬と募集人数</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="quest-reward" className="block text-sm font-semibold">1人あたりの報酬 <span className="text-[#d88e56]">*</span></label>
                <div className="relative">
                  <input id="quest-reward" type="number" min={selectedQuestType?.min_reward ?? 1} value={rewardPerPerson} onChange={(e) => setRewardPerPerson(e.target.value)} disabled={selectedQuestType?.reward_type === "fixed"} className={fieldClass + " pr-12 disabled:bg-[#f6f0e9]"} />
                  <span className="pointer-events-none absolute right-4 top-1/2 translate-y-[-25%] text-sm font-bold text-[#b2825e]">pt</span>
                </div>
                {selectedQuestType && <p className="mt-2 text-xs leading-5 text-[#9b836f]">{selectedQuestType.reward_type === "fixed" ? `固定報酬：${selectedQuestType.fixed_reward?.toLocaleString()}pt` : `最低報酬：${selectedQuestType.min_reward.toLocaleString()}pt`}</p>}
              </div>
              <div>
                <label htmlFor="quest-participants" className="block text-sm font-semibold">募集人数 <span className="text-[#d88e56]">*</span></label>
                <input id="quest-participants" type="number" min="1" max="100" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} className={fieldClass} />
                <p className="mt-2 text-xs text-[#9b836f]">最大100人まで募集できます。</p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e1] text-sm font-bold text-[#cb8853]">04</span>
              <h2 className="text-lg font-bold">応募期限と対象作品</h2>
            </div>
            <div>
              <label htmlFor="quest-deadline" className="block text-sm font-semibold">応募締切 <span className="text-[#d88e56]">*</span></label>
              <input id="quest-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClass} />
              <p className="mt-2 text-xs leading-5 text-[#9b836f]">この日時を過ぎると、新しい応募は受け付けません。</p>
            </div>
            <div className="mt-5">
              <label htmlFor="quest-url" className="block text-sm font-semibold">作品ページURL <span className="font-normal text-[#b29c88]">（任意）</span></label>
              <input id="quest-url" type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://..." className={fieldClass} />
              <p className="mt-2 text-xs leading-5 text-[#9b836f]">感想・レビュー・添削などの対象作品があれば入力してください。</p>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#efd5b8] bg-[#fff0df] p-5 sm:p-7">
            <h2 className="font-bold text-[#765039]">必要ポイントの確認</h2>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#efd6be] pb-4">
              <span className="text-sm text-[#9d7a5d]">{Number(rewardPerPerson || 0).toLocaleString()}pt × {maxParticipants || 0}人</span>
              <span className="text-2xl font-extrabold text-[#bd7844]">{totalPoints.toLocaleString()} <span className="text-base">pt</span></span>
            </div>
            <p className="mt-3 text-xs leading-6 text-[#9b7a5e]">実際のポイント消費は、クエスト作成時にサーバー側で確認・処理します。</p>
          </section>

          <button type="submit" disabled={submitting || questTypes.length === 0} className="w-full rounded-2xl bg-[#e7a36d] px-5 py-4 text-base font-bold text-white shadow-[0_5px_14px_rgba(203,136,83,0.2)] transition hover:bg-[#d9925c] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "確認中..." : "クエストを作成する"}
          </button>
        </form>
      </div>
    </main>
  )
}

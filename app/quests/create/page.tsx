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

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-gray-500">
          クエスト種類を読み込んでいます...
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl p-6">

      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← 戻る
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        クエストを作成
      </h1>

      <p className="mt-2 text-gray-500">
        他のユーザーに依頼するクエストを作成します。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >

        {/* クエスト種類 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            クエスト種類
          </h2>

          <select
            value={questTypeId}
            onChange={handleQuestTypeChange}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3"
          >
            {questTypes.map((type) => (
              <option
                key={type.id}
                value={type.id}
              >
                {type.name}
              </option>
            ))}
          </select>

          {selectedQuestType?.description && (
            <p className="mt-3 text-sm text-gray-500">
              {selectedQuestType.description}
            </p>
          )}

        </section>

        {/* 基本情報 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            依頼内容
          </h2>

          {/* タイトル */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700">
              クエストタイトル
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              maxLength={100}
              placeholder="例：小説○○の第1話を読んで感想をください"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-1 text-xs text-gray-400">
              {title.length}/100
            </p>

          </div>

          {/* 内容 */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700">
              依頼内容
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={7}
              maxLength={5000}
              placeholder="どのようなことをしてほしいか、具体的に書いてください。"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-1 text-xs text-gray-400">
              {description.length}/5000
            </p>

          </div>

        </section>

        {/* 報酬・募集 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            報酬・募集人数
          </h2>

          {/* 報酬 */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700">
              1人あたりの報酬
            </label>

            <div className="mt-2 flex items-center gap-3">

              <input
                type="number"
                min={
                  selectedQuestType?.min_reward ?? 1
                }
                value={rewardPerPerson}
                onChange={(e) =>
                  setRewardPerPerson(e.target.value)
                }
                disabled={
                  selectedQuestType?.reward_type ===
                  "fixed"
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
              />

              <span className="font-bold text-gray-700">
                pt
              </span>

            </div>

            {selectedQuestType && (
              <p className="mt-2 text-sm text-gray-500">

                {selectedQuestType.reward_type ===
                "fixed"
                  ? `固定報酬：${selectedQuestType.fixed_reward?.toLocaleString()}pt`
                  : `最低報酬：${selectedQuestType.min_reward.toLocaleString()}pt`}

              </p>
            )}

          </div>

          {/* 募集人数 */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700">
              募集人数
            </label>

            <input
              type="number"
              min="1"
              max="100"
              value={maxParticipants}
              onChange={(e) =>
                setMaxParticipants(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-2 text-sm text-gray-500">
              最大100人まで募集できます。
            </p>

          </div>

        </section>

        {/* 期限 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            期限
          </h2>

          <label className="mt-5 block text-sm font-medium text-gray-700">
            締切日時
          </label>

          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) =>
              setDeadline(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
          />

          <p className="mt-2 text-sm text-gray-500">
            この日時を過ぎると新しい応募を受け付けません。
          </p>

        </section>

        {/* 対象作品 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            対象作品
          </h2>

          <label className="mt-5 block text-sm font-medium text-gray-700">
            作品ページURL
          </label>

          <input
            type="url"
            value={targetUrl}
            onChange={(e) =>
              setTargetUrl(e.target.value)
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
          />

          <p className="mt-2 text-sm text-gray-500">
            感想・レビュー・添削などの対象作品のURLを入力してください。
          </p>

        </section>

        {/* 料金確認 */}
        <section className="rounded-2xl bg-gray-50 p-6">

          <h2 className="font-bold text-gray-900">
            必要ポイント
          </h2>

          <div className="mt-3 flex items-center justify-between">

            <span className="text-gray-600">
              {rewardPerPerson || 0}pt × {maxParticipants || 0}人
            </span>

            <span className="text-2xl font-bold text-gray-900">
              {(
                (Number(rewardPerPerson) || 0) *
                (Number(maxParticipants) || 0)
              ).toLocaleString()}
              pt
            </span>

          </div>

          <p className="mt-3 text-xs text-gray-500">
            ※実際のポイント消費はクエスト作成時にサーバー側で確認・処理します。
          </p>

        </section>

        {/* 作成ボタン */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-black px-5 py-4 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "確認中..."
            : "クエストを作成する"}
        </button>

      </form>

    </main>
  )
}
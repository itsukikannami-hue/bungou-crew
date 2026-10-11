"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

const STAGES = [
  { label: "卵期", emoji: "🥚" },
  { label: "アマチュア", emoji: "📖" },
  { label: "セミプロ", emoji: "✒️" },
  { label: "デビュー", emoji: "✨" },
]

// プロフィール内の改行タグは、HTMLとして実行せず改行として表示します。
const formatProfile = (value) =>
  value?.replace(/<br\s*\/?\s*>/gi, "\n") ?? ""

export default function AlbumDetail({ params }) {
  const { id: speciesId } = use(params)

  const [user, setUser] = useState(null)
  const [species, setSpecies] = useState(null)
  const [album, setAlbum] = useState(null)
  const [instance, setInstance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      setLoading(true)
      setError("")

      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (!active) return

      if (authError) {
        setError("ログイン情報を確認できませんでした。")
        setLoading(false)
        return
      }

      if (!authData.user) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(authData.user)

      const [speciesResult, albumResult, instanceResult] =
        await Promise.all([
          supabase
            .from("bungou_species")
            .select("*")
            .eq("id", speciesId)
            .single(),

          supabase
            .from("bungou_album")
            .select("*")
            .eq("species_id", speciesId)
            .eq("user_id", authData.user.id)
            .maybeSingle(),

          supabase
            .from("bungou_instances")
            .select("*")
            .eq("species_id", speciesId)
            .eq("user_id", authData.user.id)
            .maybeSingle(),
        ])

      if (!active) return

      if (
        speciesResult.error ||
        albumResult.error ||
        instanceResult.error
      ) {
        setError("ブンゴウの情報を取得できませんでした。")
      } else {
        setSpecies(speciesResult.data)
        setAlbum(albumResult.data)
        setInstance(instanceResult.data)
      }

      setLoading(false)
    }

    fetchData()

    return () => {
      active = false
    }
  }, [speciesId])

  const stage = Math.max(
    0,
    Math.min(
      3,
      Number(album?.final_stage ?? instance?.stage ?? 0) || 0
    )
  )

  const discovered = Boolean(album || instance)

  const imageNumber =
    species?.image_url?.match(/bungou_(\d+)\.png(?:\?|$)/)?.[1]

  const number = imageNumber ? Number(imageNumber) : null

  // 現在到達している最高成長段階の画像
  const currentImage =
    stage >= 3
      ? (
          species?.debut_image_url ||
          species?.semi_pro_image_url ||
          species?.image_url
        )
      : stage >= 2
        ? (
            species?.semi_pro_image_url ||
            species?.image_url
          )
        : species?.image_url

  // 各成長段階のプロフィール＋画像
  const profileCards = [
    {
      title: "アマチュア期",
      emoji: "📖",
      value: species?.profile_amateur,
      imageUrl: species?.image_url,
      requiredStage: 1,
    },
    {
      title: "セミプロ期",
      emoji: "✒️",
      value: species?.profile_semi,
      imageUrl: species?.semi_pro_image_url,
      requiredStage: 2,
    },
    {
      title: "デビュー",
      emoji: "✨",
      value: species?.profile_debut,
      imageUrl: species?.debut_image_url,
      requiredStage: 3,
    },
  ]

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-24 pt-6 text-[#624b3d] sm:px-6">
      <div className="mx-auto max-w-3xl">

        {/* 戻る */}
        <Link
          href="/album"
          className="inline-flex items-center gap-2 rounded-full border border-[#f0dfcc] bg-white px-4 py-2 text-sm font-semibold text-[#a86c40] shadow-sm transition hover:bg-[#fff3e5]"
        >
          <span aria-hidden="true">←</span>
          図鑑にもどる
        </Link>

        {/* 読み込み中 */}
        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center text-[#947f6f] shadow-sm">
            ブンゴウの情報を読み込んでいます…
          </div>

        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-3xl bg-white p-10 text-center text-[#a45c45] shadow-sm"
          >
            {error}
          </div>

        ) : !user ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            ログインしてください。
          </div>

        ) : !species ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            ブンゴウが見つかりませんでした。
          </div>

        ) : !discovered ? (
          <section className="mt-8 rounded-[2rem] border border-[#f1e3d4] bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[2rem] bg-[#f7f0e7] text-7xl text-[#c9b9a9]">
              ？
            </div>

            <h1 className="mt-6 text-xl font-bold">
              まだ出会っていないブンゴウ
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#947f6f]">
              ブンゴウと出会うと、ここにプロフィールが表示されます。
            </p>

          </section>
        ) : (
          <>

            {/* ============================= */}
            {/* メインプロフィール */}
            {/* ============================= */}

            <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#f1e3d4] bg-white p-6 text-center shadow-sm sm:p-9">

              <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-[#fff0de] px-4 py-1.5 text-xs font-bold tracking-wide text-[#bd7a49]">

                {number !== null
                  ? `No.${String(number).padStart(2, "0")}`
                  : "ブンゴウ図鑑"
                }

                <span className="text-[#e5b587]">
                  ✦
                </span>

                {species.rarity === "rare"
                  ? "レア"
                  : "ブンゴウ"
                }

              </div>

              {/* 現在の最高成長段階の画像 */}
              <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center rounded-[2rem] bg-[#fff7ed] p-6 sm:max-w-[300px]">

                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={`${species.name} ${STAGES[stage].label}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-7xl">
                    📚
                  </span>
                )}

              </div>

              <h1 className="mt-6 text-2xl font-bold tracking-wide sm:text-3xl">
                {species.name}
              </h1>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#fff2e5] px-4 py-2 text-sm font-bold text-[#b77646]">

                <span>
                  {STAGES[stage].emoji}
                </span>

                {STAGES[stage].label}

              </div>

              {stage === 3 && (
                <p className="mt-3 text-sm font-bold text-[#c68a44]">
                  ✦ デビューおめでとう！ ✦
                </p>
              )}

            </section>

            {/* ============================= */}
            {/* 成長のあゆみ */}
            {/* ============================= */}

            <section className="mt-6 rounded-[2rem] border border-[#f1e3d4] bg-white p-6 shadow-sm sm:p-8">

              <h2 className="text-lg font-bold">
                <span aria-hidden="true">
                  🌱{" "}
                </span>
                成長のあゆみ
              </h2>

              <p className="mt-2 text-sm text-[#947f6f]">
                ブンゴウの成長にあわせて、物語がひらかれます。
              </p>

              <div className="mt-6 grid grid-cols-4 gap-2">

                {STAGES.map((item, index) => (
                  <div
                    key={item.label}
                    className="text-center"
                  >

                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl sm:h-14 sm:w-14 ${
                        index <= stage
                          ? "bg-[#fff0dc]"
                          : "bg-[#f5f0eb] opacity-50"
                      }`}
                    >
                      {item.emoji}
                    </div>

                    <p
                      className={`mt-2 text-[11px] font-bold sm:text-xs ${
                        index <= stage
                          ? "text-[#b77748]"
                          : "text-[#ad9d8f]"
                      }`}
                    >
                      {item.label}
                    </p>

                  </div>
                ))}

              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#f3e8dd]">

                <div
                  className="h-full rounded-full bg-[#e8a56d] transition-all"
                  style={{
                    width: `${(stage / 3) * 100}%`,
                  }}
                />

              </div>

            </section>

            {/* ============================= */}
            {/* 各成長段階の物語 */}
            {/* ============================= */}

            <section className="mt-6 space-y-4">

              <h2 className="px-1 text-lg font-bold">
                <span aria-hidden="true">
                  📖{" "}
                </span>
                ブンゴウの物語
              </h2>

              {profileCards.map((card) => {

                const unlocked =
                  stage >= card.requiredStage

                return (
                  <article
                    key={card.title}
                    className={`rounded-[1.75rem] border p-5 shadow-sm sm:p-6 ${
                      unlocked
                        ? "border-[#f0dfcc] bg-white"
                        : "border-[#eee4d9] bg-[#f9f5f0]"
                    }`}
                  >

                    {/* タイトル */}
                    <div className="flex items-center justify-between gap-3">

                      <h3
                        className={`font-bold ${
                          unlocked
                            ? "text-[#ad7045]"
                            : "text-[#a99a8b]"
                        }`}
                      >
                        {card.emoji} {card.title}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          unlocked
                            ? "bg-[#fff0de] text-[#b77748]"
                            : "bg-[#eee7df] text-[#a99a8b]"
                        }`}
                      >
                        {unlocked
                          ? "解放済み"
                          : "未解放"
                        }
                      </span>

                    </div>

                    {/* 成長段階ごとの画像 */}
                    <div
                      className={`mt-5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.5rem] ${
                        unlocked
                          ? "bg-[#fff7ed]"
                          : "bg-[#f1ebe5]"
                      }`}
                    >

                      {unlocked ? (

                        card.imageUrl ? (

                          <img
                            src={card.imageUrl}
                            alt={`${species.name} ${card.title}`}
                            className="h-full w-full object-contain p-5 sm:p-7"
                          />

                        ) : (

                          <span
                            className="text-5xl"
                            aria-label="画像なし"
                          >
                            📚
                          </span>

                        )

                      ) : (

                        <span
                          className="text-6xl font-bold text-[#d1c3b6]"
                          aria-label={`${card.title}は未解放`}
                        >
                          ？
                        </span>

                      )}

                    </div>

                    {/* 説明 */}
                    <p
                      className={`mt-4 whitespace-pre-line text-sm leading-8 sm:text-base ${
                        unlocked
                          ? "text-[#695548]"
                          : "text-[#a99a8b]"
                      }`}
                    >

                      {unlocked
                        ? (
                            formatProfile(card.value) ||
                            "プロフィールはまだ登録されていません。"
                          )
                        : "成長すると、この物語が読めるようになります。"
                      }

                    </p>

                  </article>
                )
              })}

            </section>

            {/* フッター */}
            <div className="mt-8 text-center text-xs text-[#a18b79]">

              {album?.status === "debut"
                ? "✨ デビュー成功"
                : "あなたとブンゴウの物語は、まだまだ続きます。"
              }

            </div>

          </>
        )}

      </div>
    </main>
  )
}
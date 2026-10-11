"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

const STAGE_LABELS = [
  "卵期",
  "アマチュア期",
  "セミプロ期",
  "デビュー期",
]

export default function AlbumPage() {
  const [speciesList, setSpeciesList] = useState([])
  const [album, setAlbum] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const fetchAlbum = async () => {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          if (active) {
            setSpeciesList([])
            setAlbum([])
            setError("ログインしてください。")
          }
          return
        }

        const [speciesResult, albumResult] = await Promise.all([
          supabase
            .from("bungou_species")
            .select(
              "id, name, rarity, image_url, semi_pro_image_url, debut_image_url"
            ),

          supabase
            .from("bungou_album")
            .select("species_id, final_stage, status")
            .eq("user_id", user.id),
        ])

        if (speciesResult.error) {
          throw speciesResult.error
        }

        if (albumResult.error) {
          throw albumResult.error
        }

        // UUIDや登録順では判定せず、
        // image_url の bungou_1.png ～ bungou_15.png を
        // ノーマル15種の図鑑番号として使用する。
        const officialSpecies = (speciesResult.data || [])
          .map((species) => {
            const match = species.image_url?.match(
              /\/bungou_(\d+)\.png(?:\?.*)?$/
            )

            const number = match
              ? Number(match[1])
              : null

            return {
              ...species,
              officialNumber: number,
            }
          })
          .filter(
            (species) =>
              species.officialNumber >= 1 &&
              species.officialNumber <= 15
          )
          .sort(
            (a, b) =>
              a.officialNumber - b.officialNumber
          )

        if (active) {
          setSpeciesList(officialSpecies)
          setAlbum(albumResult.data || [])
        }
      } catch (err) {
        console.error(
          "ブンゴウ図鑑取得エラー:",
          err
        )

        if (active) {
          setError(
            "図鑑を読み込めませんでした。時間をおいて再度お試しください。"
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchAlbum()

    return () => {
      active = false
    }
  }, [])

  const discovered = speciesList.filter((species) =>
    album.some(
      (entry) =>
        String(entry.species_id) ===
        String(species.id)
    )
  ).length

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-7 text-[#604b3e] sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* ============================= */}
        {/* ヘッダー */}
        {/* ============================= */}

        <header className="mb-7">

          <Link
            href="/"
            className="text-sm font-medium text-[#a37b5e] transition hover:text-[#d78f57]"
          >
            ← ホームに戻る
          </Link>

          <div className="mt-5 rounded-[28px] border border-[#f1dfca] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(154,104,57,0.06)] sm:px-8">

            <p className="text-xs font-bold tracking-[0.18em] text-[#d78f57]">
              BUNGOU ALBUM
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              📚 ブンゴウ図鑑
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-[#957d6d]">
              執筆とともに出会ったブンゴウたちの記録。
              新しい仲間を少しずつ見つけていこう。
            </p>

            {!loading && !error && (
              <div className="mt-5 rounded-2xl bg-[#fff6e9] px-4 py-3">

                <div className="flex items-center justify-between gap-3 text-sm">

                  <span className="font-medium text-[#8b715e]">
                    発見したブンゴウ
                  </span>

                  <span className="font-bold text-[#c17d46]">
                    {discovered}{" "}
                    <span className="font-normal text-[#9a8573]">
                      / {speciesList.length} 種
                    </span>
                  </span>

                </div>

                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[#eedfcb]"
                  role="progressbar"
                  aria-valuenow={discovered}
                  aria-valuemin={0}
                  aria-valuemax={speciesList.length}
                  aria-label="図鑑の発見状況"
                >
                  <div
                    className="h-full rounded-full bg-[#e8a56d] transition-all"
                    style={{
                      width: `${
                        speciesList.length
                          ? (
                              discovered /
                              speciesList.length
                            ) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

              </div>
            )}

          </div>
        </header>

        {/* ============================= */}
        {/* コンテンツ */}
        {/* ============================= */}

        {loading ? (

          <div className="rounded-[24px] border border-[#f1dfca] bg-white p-10 text-center text-sm text-[#957d6d]">
            ブンゴウたちの記録を読み込んでいます…
          </div>

        ) : error ? (

          <div
            className="rounded-[24px] border border-[#f1dfca] bg-white p-10 text-center text-sm text-[#957d6d]"
            role="alert"
          >
            {error}
          </div>

        ) : speciesList.length === 0 ? (

          <div className="rounded-[24px] border border-[#f1dfca] bg-white p-10 text-center text-sm text-[#957d6d]">
            図鑑に登録されたブンゴウはまだいません。
          </div>

        ) : (

          <section aria-label="ブンゴウ一覧">

            <div className="mb-4 flex items-center justify-between gap-2 px-1">

              <h2 className="text-base font-bold">
                ブンゴウ一覧
              </h2>

              <span className="text-xs text-[#9a8573]">
                未発見の仲間は「？」で表示
              </span>

            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-5">

              {speciesList.map((species) => {

                const albumData = album.find(
                  (entry) =>
                    String(entry.species_id) ===
                    String(species.id)
                )

                const unlocked = Boolean(albumData)

                const stage = Math.max(
                  0,
                  Math.min(
                    3,
                    Number(
                      albumData?.final_stage ?? 0
                    ) || 0
                  )
                )

                const number = String(
                  species.officialNumber
                ).padStart(3, "0")

                /*
                 * 到達済みの最高成長段階の画像を表示。
                 *
                 * stage 1:
                 * image_url
                 *
                 * stage 2:
                 * semi_pro_image_url
                 *
                 * stage 3:
                 * debut_image_url
                 *
                 * 新しい画像が未登録の場合は、
                 * 前段階の画像へフォールバック。
                 */
                const displayImage =
                  stage >= 3
                    ? (
                        species.debut_image_url ||
                        species.semi_pro_image_url ||
                        species.image_url
                      )
                    : stage >= 2
                      ? (
                          species.semi_pro_image_url ||
                          species.image_url
                        )
                      : species.image_url

                const contents = (
                  <>

                    <div className="mb-2 flex items-center justify-between gap-1">

                      <span className="text-[10px] font-bold tracking-wide text-[#b39a84] sm:text-xs">
                        No. {number}
                      </span>

                      {unlocked && stage >= 3 && (
                        <span
                          className="text-xs"
                          aria-label="デビュー"
                        >
                          ✨
                        </span>
                      )}

                    </div>

                    {/* 画像 */}
                    <div
                      className={`flex aspect-square items-center justify-center overflow-hidden rounded-2xl ${
                        unlocked
                          ? "bg-[#fff7ec]"
                          : "bg-[#f6f0e7]"
                      }`}
                    >

                      {unlocked ? (

                        displayImage ? (

                          <img
                            src={displayImage}
                            alt={`${species.name} ${
                              STAGE_LABELS[stage] ?? ""
                            }`}
                            className="h-full w-full object-contain p-2"
                          />

                        ) : (

                          <span
                            className="text-4xl"
                            aria-label="画像なし"
                          >
                            📖
                          </span>

                        )

                      ) : (

                        <span
                          className="text-4xl font-bold text-[#d8c8b6] sm:text-5xl"
                          aria-label="未発見"
                        >
                          ？
                        </span>

                      )}

                    </div>

                    {/* 名前・状態 */}
                    <div className="mt-3 text-center">

                      <p className="truncate text-xs font-bold sm:text-sm">
                        {unlocked
                          ? species.name
                          : "？？？"
                        }
                      </p>

                      <p
                        className={`mt-1 text-[10px] font-medium sm:text-xs ${
                          unlocked && stage >= 3
                            ? "text-[#c88745]"
                            : "text-[#a58e7b]"
                        }`}
                      >

                        {!unlocked
                          ? "未発見"
                          : stage >= 3
                            ? "✨ デビュー"
                            : stage >= 2
                              ? "✒️ セミプロ"
                              : stage >= 1
                                ? "📖 アマチュア"
                                : "🥚 孵化"
                        }

                      </p>

                    </div>

                  </>
                )

                const cardClass =
                  "block min-w-0 rounded-[22px] border border-[#f0dfcd] bg-white p-3 shadow-[0_5px_18px_rgba(154,104,57,0.06)] sm:p-4"

                return unlocked ? (

                  <Link
                    key={species.id}
                    href={`/album/${species.id}`}
                    className={`${cardClass} transition hover:-translate-y-0.5 hover:border-[#e8b989] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d78f57]`}
                    aria-label={`${species.name}の詳細を見る`}
                  >
                    {contents}
                  </Link>

                ) : (

                  <div
                    key={species.id}
                    className={cardClass}
                    aria-label={`図鑑番号${number}：未発見`}
                  >
                    {contents}
                  </div>

                )
              })}

            </div>

          </section>
        )}

      </div>
    </main>
  )
}
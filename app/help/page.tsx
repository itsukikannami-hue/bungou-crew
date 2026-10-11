"use client"

import { useState } from "react"
import Link from "next/link"
import TutorialModal from "@/components/tutorial/TutorialModal"

type HelpItem = {
  question: string
  answer: string
}

type HelpSection = {
  title: string
  icon: string
  items: HelpItem[]
}

const helpSections: HelpSection[] = [
  {
    title: "執筆・ブンゴウ",
    icon: "✍️",
    items: [
      {
        question: "ブンゴウクルーでは何ができますか？",
        answer:
          "執筆時間と文字数を記録しながら、ブンゴウを育てられます。執筆記録の確認、ブンゴウ図鑑、バッジ、タイムラインでの交流なども楽しめます。",
      },
      {
        question: "ブンゴウはどうやって育ちますか？",
        answer:
          "執筆するとブンゴウにEXPが加算されます。成長段階は「卵期 → アマチュア期 → セミプロ期 → デビュー」の順です。",
      },
      {
        question: "EXPはどうやって増えますか？",
        answer:
          "執筆終了時に記録した文字数と執筆時間から計算されます。現在の計算式は「文字数 + 執筆時間（分）×5」です。",
      },
      {
        question: "進化に必要なEXPはいくつですか？",
        answer:
          "卵からアマチュアは5,000EXP、アマチュアからセミプロは12,500EXP、セミプロからデビューは22,500EXPが目安です。",
      },
      {
        question: "しばらく執筆しないとどうなりますか？",
        answer:
          "3日間執筆がない場合、以降は1日ごとにEXPが1,000減少します。EXPが0以下になると、そのブンゴウはアルバムに記録されたうえで手元から旅立ちます。",
      },
      {
        question: "ブンゴウ図鑑とは？",
        answer:
          "これまで育てたブンゴウを確認できるコレクションです。到達した成長段階に応じた姿や、それぞれの時期の説明を楽しめます。",
      },
      {
        question: "バッジとは？",
        answer:
          "初めての執筆、累計文字数、執筆時間、連続記録、ブンゴウの成長など、さまざまな条件を達成すると獲得できる実績です。",
      },
    ],
  },
  {
    title: "タイムライン・交流",
    icon: "💬",
    items: [
      {
        question: "タイムラインでは何ができますか？",
        answer:
          "投稿、コメント、応援、リポスト、引用リポストなどを使って、ほかの創作者と交流できます。「おすすめ」と「フォロー中」のタイムラインがあります。",
      },
      {
        question: "応援とは？",
        answer:
          "気に入った投稿や頑張っているユーザーの投稿にリアクションできる機能です。応援そのものによるポイント付与はありません。",
      },
      {
        question: "リポストと引用リポストの違いは？",
        answer:
          "リポストは投稿をそのまま共有する機能です。引用リポストでは、自分のコメントを添えて投稿を共有できます。",
      },
      {
        question: "ハッシュタグは使えますか？",
        answer:
          "使えます。投稿文に「#」から始まる言葉を入れることでハッシュタグとして扱われ、タグ検索などに利用できます。",
      },
      {
        question: "DMは使えますか？",
        answer:
          "友達との1対1のDM機能を利用できます。",
      },
    ],
  },
  {
    title: "ポイント・アイテム",
    icon: "🛍️",
    items: [
      {
        question: "ポイントは何に使えますか？",
        answer:
          "ショップのアイテム購入や広告出稿など、ブンゴウクルー内の対象機能に利用できます。",
      },
      {
        question: "連続記録フリーズとは？",
        answer:
          "連続記録を守るためのアイテムです。現在の必要ポイントは300ptです。",
      },
      {
        question: "習慣リカバリーとは？",
        answer:
          "執筆習慣をサポートするためのアイテムです。現在の必要ポイントは500ptです。",
      },
      {
        question: "EXPブーストとは？",
        answer:
          "ブンゴウの育成をサポートするアイテムです。現在の必要ポイントは500ptです。",
      },
    ],
  },
  {
    title: "広告",
    icon: "📣",
    items: [
      {
        question: "自分の作品などを広告として掲載できますか？",
        answer:
          "ポイントを利用して広告を出稿できます。無料プランでは7日1,500pt、15日2,500pt、30日4,500ptです。",
      },
      {
        question: "プレミアムプランの広告特典は？",
        answer:
          "月額500円のプレミアムでは、15日掲載が0pt、30日掲載が1,500ptになります。7日掲載は利用できません。",
      },
    ],
  },
  {
    title: "プレミアム",
    icon: "👑",
    items: [
      {
        question: "プレミアムはいくらですか？",
        answer:
          "現在のプレミアムプランは月額500円です。",
      },
      {
        question: "プレミアムに加入すると何がありますか？",
        answer:
          "無料プランの機能に加えて、広告出稿の割引、加入時2,000ptの付与などの特典があります。おすすめタイムラインでの露出優遇や広告枠優先も予定されています。",
      },
      {
        question: "プレミアムは解約できますか？",
        answer:
          "マイページの契約状態から解約手続きを行える仕組みを用意しています。解約予約後も、契約期間終了までは契約状態に応じて利用できます。",
      },
    ],
  },
]

function HelpAccordion({
  item,
  id,
}: {
  item: HelpItem
  id: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[#f1e4d7] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
        aria-controls={`${id}-answer`}
      >
        <span className="font-medium text-[#694b38]">{item.question}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-[#c77f43] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          id={`${id}-answer`}
          className="pb-5 pr-8 text-sm leading-7 text-[#846a56]"
        >
          {item.answer}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [showTutorial, setShowTutorial] = useState(false)

  return (
    <>
      <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-6 text-[#594638] sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/mypage"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f0dfcf] bg-white text-lg shadow-sm transition hover:bg-[#fff4e8]"
              aria-label="マイページへ戻る"
            >
              ←
            </Link>

            <div>
              <h1 className="text-2xl font-bold tracking-wide text-[#694b38]">
                遊び方・ヘルプ
              </h1>
              <p className="mt-1 text-sm text-[#967b65]">
                ブンゴウクルーの基本的な使い方を確認できます。
              </p>
            </div>
          </div>

          <section className="mb-7 rounded-[28px] border border-[#f0d8bf] bg-[#fff1df] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#c77f43]">
                  はじめての方へ
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#694b38]">
                  チュートリアルをもう一度見る
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#846a56]">
                  最初に表示されたチュートリアルを、いつでも再確認できます。
                  ここから見直しても初回チュートリアルの完了状態は変更されません。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="min-h-12 shrink-0 rounded-2xl bg-[#c77f43] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#b96f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c77f43]"
              >
                チュートリアルを見る
              </button>
            </div>
          </section>

          <div className="space-y-5">
            {helpSections.map((section, sectionIndex) => (
              <section
                key={section.title}
                className="overflow-hidden rounded-3xl border border-[#f0e1d2] bg-white px-5 shadow-sm sm:px-6"
              >
                <div className="flex items-center gap-3 border-b border-[#f1e4d7] py-5">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0dd] text-2xl"
                  >
                    {section.icon}
                  </div>
                  <h2 className="text-lg font-bold text-[#694b38]">
                    {section.title}
                  </h2>
                </div>

                {section.items.map((item, itemIndex) => (
                  <HelpAccordion
                    key={item.question}
                    item={item}
                    id={`help-${sectionIndex}-${itemIndex}`}
                  />
                ))}
              </section>
            ))}
          </div>

          <section className="mt-7 rounded-3xl border border-[#f0e1d2] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-[#694b38]">解決しない場合</h2>
            <p className="mt-2 text-sm leading-7 text-[#846a56]">
              お問い合わせ、利用規約、プライバシーポリシーへの導線は、正式公開に向けた次の実装工程で追加します。
            </p>
          </section>
        </div>
      </main>

      {showTutorial && (
        <TutorialModal
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}
    </>
  )
}

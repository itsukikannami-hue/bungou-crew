"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Report = {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  action: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
}

type ReporterProfile = {
  user_id: string
  username: string | null
  avatar_url: string | null
}

type ReportWithProfile = Report & {
  reporter: ReporterProfile | null
}

type ReportAction =
  | "none"
  | "quest_hidden"
  | "quest_deleted"

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [updatingReportId, setUpdatingReportId] =
    useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)

        // ログインユーザー取得
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          return
        }

        // 管理者確認
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("is_admin")
            .eq("user_id", user.id)
            .maybeSingle()

        if (profileError) {
          console.error(
            "管理者確認エラー:",
            profileError
          )

          setIsAdmin(false)
          return
        }

        if (!profile?.is_admin) {
          setIsAdmin(false)
          return
        }

        setIsAdmin(true)

        // 通報一覧取得
        const {
          data: reportData,
          error: reportError,
        } = await supabase
          .from("reports")
          .select(`
            id,
            reporter_id,
            target_type,
            target_id,
            reason,
            description,
            status,
            action,
            handled_by,
            handled_at,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })

        if (reportError) {
          console.error(
            "通報一覧取得エラー:",
            reportError
          )
          return
        }

        if (!reportData || reportData.length === 0) {
          setReports([])
          return
        }

        // 通報者IDを取得
        const reporterIds = [
          ...new Set(
            reportData.map(
              (report) => report.reporter_id
            )
          ),
        ]

        // 通報者プロフィール取得
        const {
          data: profileData,
          error: reporterError,
        } = await supabase
          .from("profiles")
          .select(`
            user_id,
            username,
            avatar_url
          `)
          .in("user_id", reporterIds)

        if (reporterError) {
          console.error(
            "通報者プロフィール取得エラー:",
            reporterError
          )
        }

        // 通報情報とプロフィールを結合
        const reportsWithProfiles =
          reportData.map((report) => {
            const reporter =
              profileData?.find(
                (profile) =>
                  profile.user_id ===
                  report.reporter_id
              ) ?? null

            return {
              ...report,
              reporter,
            }
          })

        setReports(
          reportsWithProfiles as ReportWithProfile[]
        )
      } catch (error) {
        console.error(
          "通報一覧取得エラー:",
          error
        )
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  // =========================
  // 通報処置
  // =========================
  const handleReportAction = async (
    report: ReportWithProfile,
    action: ReportAction
  ) => {
    if (updatingReportId) return

    let message = ""

    if (action === "none") {
      message =
        "この通報を「問題なし」として却下しますか？"
    }

    if (action === "quest_hidden") {
      message =
        "このクエストを非公開にしますか？\n\nクエストは削除されず、ユーザーから見えなくなります。"
    }

    if (action === "quest_deleted") {
      message =
        "このクエストを削除しますか？\n\n実際には論理削除され、関連データを残したままクエストを非公開・キャンセル状態にします。"
    }

    const confirmed = window.confirm(message)

    if (!confirmed) return

    try {
      setUpdatingReportId(report.id)

      const { error } = await supabase.rpc(
        "admin_handle_report",
        {
          p_report_id: report.id,
          p_action: action,
        }
      )

      if (error) {
        console.error(
          "通報処置エラー:",
          error
        )

        alert(
          error.message ||
            "通報の処置に失敗しました。"
        )

        return
      }

      // 画面上の通報情報を更新
      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport.id === report.id
            ? {
                ...currentReport,
                status:
                  action === "none"
                    ? "rejected"
                    : "resolved",
                action,
                handled_at:
                  new Date().toISOString(),
              }
            : currentReport
        )
      )

      if (action === "none") {
        alert(
          "通報を却下しました。"
        )
      }

      if (action === "quest_hidden") {
        alert(
          "クエストを非公開にしました。"
        )
      }

      if (action === "quest_deleted") {
        alert(
          "クエストを削除しました。"
        )
      }
    } catch (error) {
      console.error(
        "通報処置エラー:",
        error
      )

      alert(
        "通報の処置に失敗しました。"
      )
    } finally {
      setUpdatingReportId(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">
            通報を読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">
              アクセス権限がありません
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              このページは管理者のみ利用できます。
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">

        <h1 className="text-2xl font-bold text-gray-900">
          通報管理
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          ユーザーから送信された通報を確認し、必要な処置を行えます。
        </p>

        {reports.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              通報はありません。
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {reports.map((report) => {
              const reporterName =
                report.reporter?.username ||
                "名前未設定"

              const isUpdating =
                updatingReportId === report.id

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >

                  {/* ヘッダー */}
                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <h2 className="font-bold text-gray-900">
                        クエストへの通報
                      </h2>

                      <p className="mt-1 text-xs text-gray-400">
                        通報ID：{report.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        report.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : report.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : report.status === "rejected"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {report.status === "pending"
                        ? "未対応"
                        : report.status === "resolved"
                          ? "対応済み"
                          : report.status === "rejected"
                            ? "却下"
                            : report.status}
                    </span>

                  </div>

                  {/* 通報者・理由 */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">

                    <div className="rounded-xl bg-gray-50 p-4">

                      <p className="text-xs font-bold text-gray-500">
                        通報者
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {reporterName}
                      </p>

                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">

                      <p className="text-xs font-bold text-gray-500">
                        通報理由
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {report.reason}
                      </p>

                    </div>

                  </div>

                  {/* 対象 */}
                  <div className="mt-4 rounded-xl bg-gray-50 p-4">

                    <p className="text-xs font-bold text-gray-500">
                      対象
                    </p>

                    {report.target_type === "quest" ? (
                      <a
                        href={`/quests/${report.target_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-sm font-bold text-blue-600 underline hover:text-blue-800"
                      >
                        クエストを確認する
                      </a>
                    ) : (
                      <p className="mt-1 break-all text-sm text-gray-700">
                        {report.target_id}
                      </p>
                    )}

                    <p className="mt-2 break-all text-xs text-gray-400">
                      ID：{report.target_id}
                    </p>

                  </div>

                  {/* 通報内容 */}
                  {report.description && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-4">

                      <p className="text-xs font-bold text-gray-500">
                        通報内容
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {report.description}
                      </p>

                    </div>
                  )}

                  {/* 通報日時 */}
                  <p className="mt-4 text-xs text-gray-400">
                    通報日時：
                    {new Date(
                      report.created_at
                    ).toLocaleString("ja-JP")}
                  </p>

                  {/* 処置済みの場合 */}
                  {report.status !== "pending" &&
                    report.action && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">

                        <p className="text-xs font-bold text-gray-500">
                          実施した処置
                        </p>

                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {report.action === "none"
                            ? "問題なし・却下"
                            : report.action ===
                                "quest_hidden"
                              ? "クエストを非公開"
                              : report.action ===
                                  "quest_deleted"
                                ? "クエストを削除"
                                : report.action}
                        </p>

                        {report.handled_at && (
                          <p className="mt-2 text-xs text-gray-400">
                            処置日時：
                            {new Date(
                              report.handled_at
                            ).toLocaleString(
                              "ja-JP"
                            )}
                          </p>
                        )}

                      </div>
                    )}

                  {/* 処置ボタン */}
                  {report.status === "pending" && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">

                      {/* 問題なし */}
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(
                            report,
                            "none"
                          )
                        }
                        disabled={
                          updatingReportId !== null
                        }
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                      >
                        {isUpdating
                          ? "処理中..."
                          : "問題なし・却下"}
                      </button>

                      {/* 非公開 */}
                      {report.target_type ===
                        "quest" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleReportAction(
                              report,
                              "quest_hidden"
                            )
                          }
                          disabled={
                            updatingReportId !== null
                          }
                          className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {isUpdating
                            ? "処理中..."
                            : "クエストを非公開"}
                        </button>
                      )}

                      {/* 論理削除 */}
                      {report.target_type ===
                        "quest" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleReportAction(
                              report,
                              "quest_deleted"
                            )
                          }
                          disabled={
                            updatingReportId !== null
                          }
                          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {isUpdating
                            ? "処理中..."
                            : "クエストを削除"}
                        </button>
                      )}

                    </div>
                  )}

                </div>
              )
            })}

          </div>
        )}

      </div>
    </main>
  )
}
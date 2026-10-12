"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";

type ReportChangeLog = { id: string; report_id: string; admin_id: string; old_status: string; new_status: string; old_admin_note: string; new_admin_note: string; created_at: string; };

type ModerationLog = {
  id: string;
  report_id: string;
  admin_id: string;
  target_type: string;
  target_id: string;
  action: string;
  target_snapshot: Record<string, unknown>;
  created_at: string;
};

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

const statuses: { value: ReportStatus; label: string }[] = [
  { value: "pending", label: "未対応" },
  { value: "reviewing", label: "確認中" },
  { value: "resolved", label: "対応済み" },
  { value: "dismissed", label: "対応不要" },
];
const statusLabel = (value: string) => statuses.find(s => s.value === value)?.label ?? value;
const typeLabel = (value: string) => ({ post: "投稿", user: "ユーザー", comment: "コメント" } as Record<string, string>)[value] ?? value;
const dateLabel = (value: string) => value ? new Date(value).toLocaleString("ja-JP") : "—";

export default function AdminReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ReportStatus>("pending");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [changeLogs, setChangeLogs] = useState<ReportChangeLog[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setAccessDenied(true);
      setReports([]);
      setLoading(false);
      return;
    }
    // 管理者判定はRPC内でも必ず実施。クライアント側の状態は認可根拠にしない。
    const { data, error: rpcError } = await supabase.rpc("admin_list_user_reports");
    if (rpcError) {
      console.error("通報一覧取得エラー", rpcError);
      if (rpcError.code === "42501" || rpcError.code === "PGRST301") setAccessDenied(true);
      else setError("通報一覧を取得できませんでした。SQLと権限を確認してください。");
      setReports([]);
    } else if (!Array.isArray(data)) {
      setError("通報データの形式が正しくありません。");
      setReports([]);
    } else {
      setAccessDenied(false);
      setReports(data as Report[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => reports.filter(r =>
    (typeFilter === "all" || r.target_type === typeFilter) &&
    (statusFilter === "all" || r.status === statusFilter)
  ), [reports, typeFilter, statusFilter]);
  const selected = reports.find(r => r.id === selectedId) ?? null;

  async function fetchLogs(reportId: string) {
    setLogsLoading(true);
    setLogsError("");
    setLogs([]);
    const { data, error: logError } = await supabase.rpc("admin_list_moderation_logs", { p_report_id: reportId });
    if (logError) {
      console.error("操作履歴取得エラー", logError);
      setLogsError("操作履歴を取得できませんでした。");
    } else {
      setLogs(Array.isArray(data) ? data as ModerationLog[] : []);
    }
    setLogsLoading(false);
  }

  async function fetchChanges(reportId: string) {
    setChangesLoading(true);
    setChangesError("");
    setChangeLogs([]);
    const { data, error: historyError } = await supabase.rpc("admin_list_report_change_logs", { p_report_id: reportId });
    if (historyError) {
      console.error("通報変更履歴取得エラー", historyError);
      setChangesError("変更履歴を取得できませんでした。");
    } else {
      setChangeLogs(Array.isArray(data) ? data as ReportChangeLog[] : []);
    }
    setChangesLoading(false);
  }

  async function moderate() {
    if (!selected || moderating || saving || logsLoading || logsError || logs.length > 0) return;
    const action = selected.target_type === "post" ? "hide_post" : selected.target_type === "comment" ? "delete_comment" : null;
    if (!action) return;
    const description = action === "hide_post" ? "投稿を非表示" : "コメントを完全に削除";
    if (!window.confirm(`この${typeLabel(selected.target_type)}を${description}しますか？\n操作は取り消せません。`)) return;
    setModerating(true);
    setError("");
    const { data, error: actionError } = await supabase.rpc("admin_moderate_report_target", {
      p_report_id: selected.id,
      p_action: action,
    });
    if (actionError || !data?.success) {
      console.error("管理者対応エラー", actionError);
      toast.error("対応操作に失敗しました。対象が既に削除されているか、権限・外部キー制約を確認してください。");
    } else {
      toast.success(`${description}しました。対応履歴に記録されています。通報の対応状況は別途保存してください。`);
      await fetchLogs(selected.id);
    }
    setModerating(false);
  }

  function openReport(report: Report) {
    setSelectedId(report.id);
    setEditStatus(statuses.some(s => s.value === report.status) ? report.status as ReportStatus : "pending");
    setEditNote(report.admin_note ?? "");
    setError("");
    void fetchLogs(report.id);
    void fetchChanges(report.id);
  }

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    const { data, error: saveError } = await supabase.rpc("admin_update_user_report", {
      p_report_id: selected.id,
      p_status: editStatus,
      p_admin_note: editNote,
    });
    if (saveError || !data) {
      console.error("通報更新エラー", saveError);
      toast.error("保存できませんでした。権限やstatus制約を確認してください。");
    } else {
      setReports(prev => prev.map(r => r.id === selected.id ? {
        ...r,
        status: data.status,
        admin_note: data.admin_note,
        updated_at: data.updated_at,
      } : r));
      toast.success("対応状況と管理者メモを保存しました。");
      await fetchChanges(selected.id);
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-8 text-[#624c3d] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/admin/users" className="text-sm font-semibold text-[#b37b50] hover:underline">← ユーザー管理へ</Link>
          <h1 className="mt-3 text-2xl font-bold">通報管理</h1>
          <p className="mt-2 text-sm text-[#917b69]">投稿・ユーザー・コメントへの通報を確認し、対応状況を管理します。</p>
        </div>

        {loading ? <p className="rounded-2xl bg-white p-8">読み込み中...</p> : accessDenied ? (
          <div className="rounded-2xl border border-[#ead9c8] bg-white p-8" role="alert">管理者のみアクセスできます。管理者アカウントでログインしてください。</div>
        ) : <>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statuses.map(s => <div key={s.value} className="rounded-2xl border border-[#f1e5d9] bg-white p-4">
              <p className="text-sm text-[#917b69]">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">{reports.filter(r => r.status === s.value).length}</p>
            </div>)}
          </div>
          <div className="flex flex-wrap gap-3 rounded-2xl border border-[#f1e5d9] bg-white p-4">
            <label className="text-sm">通報対象
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="ml-2 rounded-lg border border-[#ead9c8] p-2">
                <option value="all">すべて</option><option value="post">投稿</option><option value="user">ユーザー</option><option value="comment">コメント</option>
              </select>
            </label>
            <label className="text-sm">対応状況
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ml-2 rounded-lg border border-[#ead9c8] p-2">
                <option value="all">すべて</option>{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-[#ead9c8] px-4 py-2 text-sm hover:bg-[#fff4e7]">再読み込み</button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#f1e5d9] bg-white">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#fff7ee] text-[#816b5a]"><tr>
                <th className="px-4 py-3">日時</th><th className="px-4 py-3">対象</th><th className="px-4 py-3">理由</th><th className="px-4 py-3">状況</th><th className="px-4 py-3">詳細</th>
              </tr></thead>
              <tbody className="divide-y divide-[#f1e5d9]">
                {filtered.map(r => <tr key={r.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{dateLabel(r.created_at)}</td>
                  <td className="px-4 py-3">{typeLabel(r.target_type)}</td>
                  <td className="px-4 py-3 break-words">{r.reason}</td>
                  <td className="px-4 py-3">{statusLabel(r.status)}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => openReport(r)} className="font-semibold text-[#b37b50] underline">確認する</button></td>
                </tr>)}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#917b69]">該当する通報はありません。</td></tr>}
              </tbody>
            </table>
          </div>
          {selected && <section className="rounded-2xl border border-[#f1e5d9] bg-white p-5" aria-label="通報詳細">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">通報詳細</h2><button type="button" onClick={() => setSelectedId(null)} className="text-sm underline">閉じる</button></div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">通報ID</dt><dd className="mt-1 break-all">{selected.id}</dd></div>
              <div><dt className="font-semibold">通報日時</dt><dd className="mt-1">{dateLabel(selected.created_at)}</dd></div>
              <div><dt className="font-semibold">通報者ID</dt><dd className="mt-1 break-all">{selected.reporter_id}</dd></div>
              <div><dt className="font-semibold">通報対象</dt><dd className="mt-1">{typeLabel(selected.target_type)} / <span className="break-all">{selected.target_id}</span></dd></div>
              <div><dt className="font-semibold">通報理由</dt><dd className="mt-1 whitespace-pre-wrap break-words">{selected.reason}</dd></div>
              <div><dt className="font-semibold">最終更新</dt><dd className="mt-1">{dateLabel(selected.updated_at)}</dd></div>
            </dl>
            <div className="mt-4"><p className="text-sm font-semibold">通報の詳細</p><p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-[#fffaf4] p-3 text-sm">{selected.details || "（詳細なし）"}</p></div>
            {selected.target_type === "user" && <Link className="mt-3 inline-block text-sm text-[#b37b50] underline" href={`/user/${selected.target_id}`}>対象プロフィールを開く</Link>}
            {selected.target_type === "post" && <Link className="mt-3 inline-block text-sm text-[#b37b50] underline" href={`/posts/${selected.target_id}`}>対象投稿を開く</Link>}
            <p className="mt-3 text-xs text-[#917b69]">コメントの対象IDはコメントIDです。投稿IDとの対応確認は今後の管理機能で追加できます。</p>
            <div className="mt-5 space-y-4 border-t border-[#f1e5d9] pt-4">
              <label className="block text-sm font-semibold">対応状況
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as ReportStatus)} className="mt-2 block w-full max-w-xs rounded-lg border border-[#ead9c8] p-3">
                  {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">管理者メモ（最大5,000文字）
                <textarea value={editNote} maxLength={5000} onChange={e => setEditNote(e.target.value)} rows={5} className="mt-2 block w-full rounded-lg border border-[#ead9c8] p-3 font-normal" placeholder="確認内容・対応理由など" />
              </label>
              <button type="button" disabled={saving || editNote.length > 5000} onClick={() => void save()} className="rounded-xl bg-[#d78f57] px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? "保存中..." : "変更を保存"}</button>
            </div>
            {(selected.target_type === "post" || selected.target_type === "comment") && <div className="mt-6 border-t border-[#f1e5d9] pt-5">
              <h3 className="font-bold">コンテンツへの対応</h3>
              <p className="mt-2 text-sm text-[#917b69]">対象への操作は通報の対応状況とは別に実行します。</p>
              <button type="button" onClick={() => void moderate()} disabled={moderating || saving || logsLoading || !!logsError || logs.length > 0}
                className="mt-3 rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50">
                {moderating ? "処理中..." : logs.length > 0 ? "対応履歴あり（再操作不可）" : selected.target_type === "post" ? "投稿を非表示にする" : "コメントを削除する"}
              </button>
              {logsError && <p className="mt-2 text-sm text-red-700">履歴を確認できないため操作できません。</p>}
            </div>}
            <div className="mt-6 border-t border-[#f1e5d9] pt-5">
              <h3 className="font-bold">対応状況・管理者メモの変更履歴</h3>
              <p className="mt-1 text-xs text-[#917b69]">変更があった場合のみ記録されます。過去のメモには通報内容などの機密情報が含まれる場合があります。</p>
              {changesLoading ? <p className="mt-3 text-sm">読み込み中...</p> : changesError ? <p role="alert" className="mt-3 text-sm text-red-700">{changesError}</p> : changeLogs.length === 0 ? <p className="mt-3 text-sm text-[#917b69]">変更履歴はありません。</p> :
                <div className="mt-3 space-y-3">{changeLogs.map(log => <article key={log.id} className="rounded-xl border border-[#ead9c8] bg-[#fffaf4] p-4 text-sm">
                  <p className="font-semibold">{dateLabel(log.created_at)} <span className="font-normal text-[#917b69]">管理者: {log.admin_id}</span></p>
                  <p className="mt-2">対応状況：{statusLabel(log.old_status)} → {statusLabel(log.new_status)}</p>
                  {log.old_admin_note !== log.new_admin_note && <details className="mt-2"><summary className="cursor-pointer font-semibold">管理者メモの変更を表示</summary>
                    <p className="mt-2 whitespace-pre-wrap break-words">変更前：{log.old_admin_note || "（空欄）"}</p>
                    <p className="mt-2 whitespace-pre-wrap break-words">変更後：{log.new_admin_note || "（空欄）"}</p>
                  </details>}
                </article>)}</div>}
              <button type="button" onClick={() => void fetchChanges(selected.id)} disabled={changesLoading} className="mt-3 rounded-lg border border-[#ead9c8] px-3 py-2 text-sm disabled:opacity-50">履歴を再読み込み</button>
            </div>
            <div className="mt-6 border-t border-[#f1e5d9] pt-5">
              <h3 className="font-bold">コンテンツへの対応履歴</h3>
              {logsLoading ? <p className="mt-3 text-sm">読み込み中...</p> : logsError ? <p role="alert" className="mt-3 text-sm text-red-700">{logsError}</p> : logs.length === 0 ? <p className="mt-3 text-sm text-[#917b69]">対応履歴はありません。</p> :
                <div className="mt-3 space-y-2">{logs.map(log => <div key={log.id} className="rounded-xl bg-[#fffaf4] p-3 text-sm">
                  <p className="font-semibold">{log.action === "hide_post" ? "投稿の非表示" : log.action === "delete_comment" ? "コメント削除" : log.action}</p>
                  <p className="mt-1 text-xs text-[#917b69]">{dateLabel(log.created_at)} / 管理者: {log.admin_id}</p>
                </div>)}</div>}
            </div>
          </section>}
        </>}
      </div>
    </main>
  );
}

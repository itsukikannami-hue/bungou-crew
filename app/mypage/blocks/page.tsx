"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import UserAvatar from "@/components/UserAvatar";

type Relation = {
  id: string;
  otherId: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

type RelationRow = { id: string; blocked_id?: string; muted_id?: string; created_at: string };
type Tab = "blocks" | "mutes";

export default function BlockMuteManagementPage() {
  const [tab, setTab] = useState<Tab>("blocks");
  const [blocks, setBlocks] = useState<Relation[]>([]);
  const [mutes, setMutes] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const current = auth.user;
      setLoggedIn(Boolean(current));
      if (!current) {
        setBlocks([]);
        setMutes([]);
        return;
      }
      const [blockResult, muteResult] = await Promise.all([
        supabase.from("user_blocks").select("id,blocked_id,created_at").eq("blocker_id", current.id).order("created_at", { ascending: false }),
        supabase.from("user_mutes").select("id,muted_id,created_at").eq("muter_id", current.id).order("created_at", { ascending: false }),
      ]);
      if (blockResult.error) throw blockResult.error;
      if (muteResult.error) throw muteResult.error;
      const blockRows = (blockResult.data ?? []) as RelationRow[];
      const muteRows = (muteResult.data ?? []) as RelationRow[];
      const ids = [...new Set([
        ...blockRows.map(row => row.blocked_id).filter((id): id is string => Boolean(id)),
        ...muteRows.map(row => row.muted_id).filter((id): id is string => Boolean(id)),
      ])];
      // プロフィールはRLSで非表示になる場合があるため、取得できなくても解除操作を提供する。
      const profilesResult = ids.length
        ? await supabase.from("profiles").select("user_id,username,avatar_url").in("user_id", ids)
        : { data: [], error: null };
      if (profilesResult.error) console.warn("プロフィール情報の取得に失敗しました:", profilesResult.error);
      const profiles = new Map((profilesResult.data ?? []).map(p => [p.user_id, p]));
      setBlocks(blockRows.filter(row => row.blocked_id).map(row => ({
        id: row.id, otherId: row.blocked_id!, created_at: row.created_at,
        username: profiles.get(row.blocked_id!)?.username ?? null,
        avatar_url: profiles.get(row.blocked_id!)?.avatar_url ?? null,
      })));
      setMutes(muteRows.filter(row => row.muted_id).map(row => ({
        id: row.id, otherId: row.muted_id!, created_at: row.created_at,
        username: profiles.get(row.muted_id!)?.username ?? null,
        avatar_url: profiles.get(row.muted_id!)?.avatar_url ?? null,
      })));
    } catch (err) {
      console.error("ブロック・ミュート管理の取得エラー:", err);
      setError("一覧を取得できませんでした。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (item: Relation) => {
    const isBlock = tab === "blocks";
    const label = isBlock ? "ブロック" : "ミュート";
    if (!window.confirm(`${label}を解除しますか？`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ログインが必要です");
      const result = isBlock
        ? await supabase.from("user_blocks").delete().eq("id", item.id).eq("blocker_id", auth.user.id).select("id")
        : await supabase.from("user_mutes").delete().eq("id", item.id).eq("muter_id", auth.user.id).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("対象の設定が見つかりませんでした");
      await load();
    } catch (err) {
      console.error(`${label}解除エラー:`, err);
      setError(`${label}を解除できませんでした。再度お試しください。`);
    } finally {
      setBusyId(null);
    }
  };

  const current = tab === "blocks" ? blocks : mutes;
  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-20 pt-7 text-[#624c3d] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/mypage" className="text-sm font-semibold text-[#bb8055] hover:underline">← マイページへ戻る</Link>
        <h1 className="mt-5 text-2xl font-bold">ブロック・ミュート管理</h1>
        <p className="mt-2 text-sm leading-6 text-[#907b68]">設定したユーザーを確認し、いつでも解除できます。ブロックはお互いのプロフィール・投稿を非表示にし、ミュートは自分の画面だけを非表示にします。</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#f0e1d2] bg-white shadow-sm">
          <div className="grid grid-cols-2 border-b border-[#f0e1d2]">
            <button type="button" onClick={() => setTab("blocks")} className={`px-3 py-4 text-sm font-bold ${tab === "blocks" ? "border-b-[3px] border-[#d78f57] text-[#b9743f]" : "text-[#9b8878]"}`}>ブロック中（{blocks.length}）</button>
            <button type="button" onClick={() => setTab("mutes")} className={`px-3 py-4 text-sm font-bold ${tab === "mutes" ? "border-b-[3px] border-[#d78f57] text-[#b9743f]" : "text-[#9b8878]"}`}>ミュート中（{mutes.length}）</button>
          </div>
          {error && <p role="alert" className="mx-4 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? <p className="p-10 text-center text-sm">読み込み中...</p>
            : loggedIn === false ? <p className="p-10 text-center text-sm"><Link href="/login" className="underline">ログイン</Link>してください。</p>
            : current.length === 0 ? <p className="p-10 text-center text-sm text-[#907b68]">{tab === "blocks" ? "ブロック" : "ミュート"}中のユーザーはいません。</p>
            : <div className="divide-y divide-[#f4e9dc]">{current.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <UserAvatar src={item.avatar_url || "/default-avatar.svg"} alt="ユーザーアイコン" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.username || "非表示のユーザー"}</p>
                  <p className="mt-1 text-xs text-[#a18a75]">設定日：{new Date(item.created_at).toLocaleDateString("ja-JP")}</p>
                </div>
                <button type="button" disabled={busyId !== null} onClick={() => void remove(item)} className="shrink-0 rounded-xl border border-[#e6bb9a] px-3 py-2 text-sm font-semibold text-[#b9743f] hover:bg-[#fff5e9] disabled:opacity-50">{busyId === item.id ? "解除中..." : "解除する"}</button>
              </div>
            ))}</div>}
        </section>
      </div>
    </main>
  );
}

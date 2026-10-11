"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Heart, Repeat2, MessageCircle, ScrollText, Users, Megaphone, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getNotifications, markAllAsRead, markAsRead } from "@/lib/notification";

type Notice = {
  id: string; user_id: string; type: string; content: string; is_read: boolean;
  created_at: string; actor_id?: string | null; post_id?: string | null;
  quest_id?: string | null; link?: string | null;
};
type Category = "posts" | "quests" | "social" | "system";
type NoticeGroup = { key: string; category: Category; kind: string; items: Notice[]; newest: string; unread: boolean };
const tabs = [
  { id: "all", label: "すべて" }, { id: "posts", label: "ポスト" },
  { id: "quests", label: "クエスト" }, { id: "social", label: "交流" },
  { id: "system", label: "運営" },
] as const;

function classify(n: Notice): { category: Category; kind: string } {
  const type = (n.type || "").toLowerCase();
  if (/quest|クエスト/.test(type)) return { category: "quests", kind: "quest" };
  if (/cheer|like|応援/.test(type)) return { category: "posts", kind: "cheer" };
  if (/repost|retweet|リポスト/.test(type)) return { category: "posts", kind: "repost" };
  if (/comment|reply|mention|コメント|返信/.test(type)) return { category: "posts", kind: "comment" };
  if (/follow|friend|フォロー|フレンド/.test(type)) return { category: "social", kind: "social" };
  if (n.post_id) return { category: "posts", kind: "post" };
  return { category: "system", kind: "system" };
}
function destination(n: Notice): string | null {
  // ポスト通知では旧データにプロフィールやタイムラインへのリンクが保存されているため、
  // post_id があれば投稿詳細へのリンクを優先する。
  if (n.post_id) return `/posts/${encodeURIComponent(n.post_id)}`;
  if (n.quest_id) return `/quests/${encodeURIComponent(n.quest_id)}`;
  if (n.link && n.link.startsWith("/") && !n.link.startsWith("//")) return n.link;
  return null;
}

function groupNotices(items: Notice[]): NoticeGroup[] {
  const groups = new Map<string, NoticeGroup>();
  for (const n of items) {
    const { category, kind } = classify(n);
    // 同じポストへの応援／リポストだけ集約。post_id がない通知は集約しない。
    const key = (kind === "cheer" || kind === "repost") && n.post_id
      ? `${kind}:${n.post_id}` : `single:${n.id}`;
    const existing = groups.get(key);
    if (existing) { existing.items.push(n); existing.unread ||= !n.is_read; }
    else groups.set(key, { key, category, kind, items: [n], newest: n.created_at, unread: !n.is_read });
  }
  return [...groups.values()].sort((a, b) => new Date(b.newest).getTime() - new Date(a.newest).getTime());
}
function displayNoticeContent(n: { type: string; content: string }): string {
  return /repost|retweet/i.test(n.type)
    ? n.content.replace(/リポスト/g, "拡散").replace(/リツイート/g, "拡散")
    : n.content
}

function groupLabel(group: NoticeGroup): string {
  const first = group.items[0];
  if ((group.kind === "cheer" || group.kind === "repost") && group.items.length > 1) {
    // actor_id はユーザーIDのため、表示名が未取得なら名前を推測しない。
    const action = group.kind === "cheer" ? "応援" : "拡散";
    const uniqueActors = new Set(group.items.map(n => n.actor_id).filter(Boolean));
    const count = uniqueActors.size || group.items.length;
    return `あなたのポストが${count}名から${action}されました`;
  }
  return displayNoticeContent(first);
}
function iconFor(kind: string) {
  if (kind === "cheer") return <Heart size={19} />;
  if (kind === "repost") return <Repeat2 size={19} />;
  if (kind === "comment" || kind === "post") return <MessageCircle size={19} />;
  if (kind === "quest") return <ScrollText size={19} />;
  if (kind === "social") return <Users size={19} />;
  return <Megaphone size={19} />;
}
export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notice[]>([]);
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted) return;
      if (!user) { router.replace("/login"); setLoading(false); return; }
      setUserId(user.id);
      const data = await getNotifications(user.id);
      if (mounted) { setItems(data as Notice[]); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [router]);
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications-page-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        payload => setItems(prev => [payload.new as Notice, ...prev.filter(n => n.id !== payload.new.id)]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
  const groups = useMemo(() => groupNotices(items), [items]);
  const visible = groups.filter(g => active === "all" || g.category === active);
  const unread = items.filter(n => !n.is_read).length;
  const openNotice = async (group: NoticeGroup) => {
    const ids = group.items.filter(n => !n.is_read).map(n => n.id);
    setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    await Promise.all(ids.map(id => markAsRead(id)));
    const url = destination(group.items[0]);
    if (url) router.push(url);
  };
  const readAll = async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };
  return <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-7 text-[#775b45] sm:px-6">
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><Bell className="text-[#cb8556]" /><h1 className="text-2xl font-bold">通知</h1>{unread > 0 && <span className="rounded-full bg-[#e9a46d] px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}</div>
          <p className="mt-1 text-sm text-[#a0846e]">あなたへのお知らせをまとめて確認できます。</p></div>
        <button type="button" onClick={readAll} disabled={!unread} className="flex items-center gap-1 rounded-full border border-[#e9cfb7] bg-white px-3 py-2 text-sm font-semibold text-[#ad764f] disabled:opacity-40"><CheckCheck size={16} />すべて既読</button>
      </div>
      <div role="tablist" aria-label="通知の種類" className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active === tab.id ? "bg-[#d78f57] text-white" : "border border-[#f0decc] bg-white text-[#9d785d] hover:bg-[#fff1e2]"}`}>{tab.label}</button>)}
      </div>
      <section className="space-y-3" aria-live="polite">
        {loading ? <div className="rounded-2xl bg-white p-8 text-center text-sm">読み込み中...</div>
          : visible.length === 0 ? <div className="rounded-2xl border border-[#f0decc] bg-white p-10 text-center"><Bell className="mx-auto mb-3 text-[#d6ac8b]" size={32} /><p className="font-semibold">このタブにはまだ通知がありません</p></div>
          : visible.map(g => {
            const target = destination(g.items[0]);
            return <button key={g.key} type="button" onClick={() => openNotice(g)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:bg-[#fff5e9] ${g.unread ? "border-[#e7bd96] bg-[#fff5e8]" : "border-[#f0e0d1] bg-white"}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffead6] text-[#c18453]">{iconFor(g.kind)}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-6">{groupLabel(g)}</span>
                {g.items.length > 1 && <span className="mt-1 block text-xs text-[#9d785d]">{g.items.length}件の通知</span>}
                <span className="mt-1 block text-xs text-[#a68d7b]">{new Date(g.newest).toLocaleString("ja-JP")}{!target && " · 遷移先未設定"}</span></span>
              {g.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#e79b61]" aria-label="未読" />}
            </button>;
          })}
      </section>
    </div>
  </main>;
}

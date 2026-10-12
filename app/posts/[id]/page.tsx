"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notification";
import { hydrateReposts } from "@/lib/hydrateReposts";
import PostCard from "@/components/PostCard";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/components/ToastProvider";

type Post = React.ComponentProps<typeof PostCard>["post"];
type Comment = { id: string; user_id: string; content: string; created_at: string; profiles?: { username: string | null; avatar_url: string | null } | null };

export default function PostDetailPage() {
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  async function loadComments(hiddenIds: string[] = hiddenUserIds) {
    const { data, error: commentsError } = await supabase.from("post_comments")
      .select("id,user_id,content,created_at")
      .eq("post_id", id).order("created_at", { ascending: true });
    if (commentsError) { console.error(commentsError); return; }
    const hidden = new Set(hiddenIds);
    const rows = (data ?? []).filter(c => !hidden.has(c.user_id));
    const ids = [...new Set(rows.map(c => c.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id,username,avatar_url").in("user_id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map(p => [p.user_id, p]));
    setComments(rows.map(c => ({ ...c, profiles: byId.get(c.user_id) ?? null })));
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      setPost(null);
      setComments([]);
      setError("");
      setCanRetry(false);
      setHiddenUserIds([]);
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError) {
        setError("ログイン状態を確認できませんでした。再試行してください。");
        setCanRetry(true);
        setLoading(false);
        return;
      }
      const currentUser = auth.user ?? null;
      setUser(currentUser);

      // タイムラインと同じ判定関数を利用し、非公開の相手側ブロックも反映する。
      let hiddenIds: string[] = [];
      if (currentUser) {
        const { data: hiddenData, error: hiddenError } = await supabase.rpc("get_timeline_hidden_user_ids");
        if (!active) return;
        if (hiddenError || !Array.isArray(hiddenData)) {
          console.error("非表示ユーザーの取得エラー:", hiddenError);
          setError("ブロック・ミュート設定を確認できませんでした。再試行してください。");
          setCanRetry(true);
          setLoading(false);
          return;
        }
        hiddenIds = hiddenData as string[];
      }
      const hidden = new Set(hiddenIds);
      setHiddenUserIds(hiddenIds);

      const { data, error: fetchError } = await supabase.from("posts")
        .select("*,profiles(username,avatar_url),post_cheers(id)")
        .eq("id", id).maybeSingle();
      if (!active) return;
      if (fetchError || !data) {
        setError(fetchError ? "ポストを読み込めませんでした。" : "このポストは存在しないか、削除されています。");
        setCanRetry(Boolean(fetchError));
        setLoading(false);
        return;
      }
      if (data.deleted) {
        setError("このポストは削除されています。");
        setLoading(false);
        return;
      }
      if (hidden.has(data.user_id)) {
        setError("このポストはブロック・ミュート設定により表示できません。");
        setLoading(false);
        return;
      }
      // 元投稿の作者も確認。元投稿を取得できない場合は安全側で表示しない。
      if (data.repost_id) {
        const { data: original, error: originalError } = await supabase.from("posts")
          .select("user_id").eq("id", data.repost_id).maybeSingle();
        if (!active) return;
        if (originalError || !original) {
          setError("拡散元の投稿を確認できませんでした。");
          setCanRetry(Boolean(originalError));
          setLoading(false);
          return;
        }
        if (hidden.has(original.user_id)) {
          setError("このポストはブロック・ミュート設定により表示できません。");
          setLoading(false);
          return;
        }
      }
      try {
        const hydrated = await hydrateReposts([data]);
        if (!active) return;
        setPost(hydrated[0] as Post);
        await loadComments(hiddenIds);
      } catch (loadError) {
        console.error("投稿詳細の読み込みエラー:", loadError);
        if (!active) return;
        setPost(null);
        setError("ポストを読み込めませんでした。");
        setCanRetry(true);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [id, retryKey]);

  async function sendComment() {
    if (!user || !post || !text.trim() || sending) return;
    if (hiddenUserIds.includes(post.user_id) || (post.repost && hiddenUserIds.includes(post.repost.user_id))) return;
    setSending(true); setError("");
    const { error: insertError } = await supabase.from("post_comments").insert({
      post_id: post.id, user_id: user.id, content: text.trim(),
    });
    if (insertError) { setError("コメントを送信できませんでした。"); toast.error("コメントを送信できませんでした。"); console.error(insertError); setSending(false); return; }
    if (post.user_id !== user.id) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
      const notice = await createNotification(post.user_id, "comment", `${profile?.username ?? "誰か"}さんがあなたの投稿にコメントしました`, user.id, post.id, `/posts/${post.id}`);
      if (!notice.success) console.error("コメント通知エラー", notice.error);
    }
    setText(""); toast.success("コメントを投稿しました。"); await loadComments(hiddenUserIds); setSending(false);
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-7 text-[#624c3d]">
      <div className="mx-auto max-w-2xl">
        <Link href="/timeline" className="mb-5 inline-block text-sm font-semibold text-[#bb8055] hover:underline">← タイムラインへ</Link>
        <h1 className="mb-5 text-xl font-bold">ポスト</h1>
        {loading ? <div role="status" aria-busy="true" aria-label="投稿を読み込み中" className="animate-pulse motion-reduce:animate-none rounded-2xl bg-white p-6 space-y-4">
              <span className="sr-only">投稿を読み込んでいます</span>
              <div className="h-11 w-11 rounded-full bg-[#f0e5da]" />
              <div className="h-4 w-2/5 rounded bg-[#f0e5da]" />
              <div className="h-4 w-full rounded bg-[#f0e5da]" />
              <div className="h-4 w-3/4 rounded bg-[#f0e5da]" />
            </div>
          : error && !post ? <div role="alert" className="rounded-2xl bg-white p-8 text-center">
              <p>{error}</p>
              {canRetry && <button type="button" onClick={() => setRetryKey(n => n + 1)} className="mt-4 min-h-11 rounded-xl bg-[#d78f57] px-5 py-3 font-semibold text-white">再試行する</button>}
            </div>
          : post ? <>
              <PostCard post={post} user={user} detailMode />
              <section className="mt-5 rounded-2xl border border-[#f1e5d9] bg-white p-4 sm:p-5">
                <h2 className="mb-4 font-bold">コメント（{comments.length}）</h2>
                {comments.length === 0 && <p className="mb-4 text-sm text-[#9c8877]">まだコメントはありません。</p>}
                <div className="space-y-4">
                  {comments.map(comment => <article key={comment.id} className="border-b border-[#f1e5d9] pb-4 last:border-0">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${comment.user_id}`}><UserAvatar src={comment.profiles?.avatar_url} alt="ユーザーアイコン" width={40} height={40} className="h-10 w-10 rounded-full object-cover" /></Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/user/${comment.user_id}`} className="font-semibold hover:underline">{comment.profiles?.username ?? "名無し作家"}</Link>
                        <time className="ml-2 text-xs text-[#aa9583]">{new Date(comment.created_at).toLocaleString("ja-JP")}</time>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </article>)}
                </div>
                {user ? <div className="mt-5 border-t border-[#f1e5d9] pt-4">
                  <label htmlFor="post-comment" className="mb-2 block text-sm font-semibold">コメントを書く</label>
                  <textarea id="post-comment" value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="コメントを入力..." className="w-full rounded-xl border border-[#ead9c8] bg-[#fffaf4] p-3 outline-none focus:border-[#d99b6b]" />
                  <button disabled={sending || !text.trim()} onClick={sendComment} className="mt-2 rounded-xl bg-[#d78f57] px-5 py-2 font-semibold text-white disabled:opacity-50">{sending ? "送信中..." : "コメントする"}</button>
                </div> : <p className="mt-5 text-sm">コメントするには<Link href="/login" className="ml-1 underline">ログイン</Link>してください。</p>}
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
              </section>
            </> : null}
      </div>
    </main>
  );
}

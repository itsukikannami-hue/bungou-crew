import { supabase } from "./supabaseClient";

// ---------- プロフィール関連 ----------

// プロフィール取得（存在しなければ初期化）
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") {
    // 行が存在しない場合は初期プロフィールを作る
    await createInitialProfile(userId);
    return { user_id: userId, username: "", bio: "", avatar_url: "" };
  }

  if (error) console.error("getProfile error:", error);
  return data;
}

// プロフィール保存（upsertで新規作成 or 更新）
export async function saveProfile(
    userId: string,
    username: string,
    bio: string,
    avatar_url: string
  ) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId, // ← 必ずログインユーザーの UID
          username,
          bio,
          avatar_url
        },
        { onConflict: "user_id" }
      )
      .select();
  
    if (error) console.error("saveProfile error:", error);
  
    return { data, error };
  }

// 初期プロフィール作成
export async function createInitialProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,  // ← UID
        username: "",
        bio: "",
        avatar_url: ""
      });
  
    if (error) console.error("初期プロフィール作成エラー:", error);
    return { data, error };
  }

// ---------- アバターアップロード ----------

export const uploadAvatar = async (file: File): Promise<string | null> => {
  try {
    if (!file) return null;

    // ファイル名を安全化
    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");
    const fileName = `${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      console.error("アップロードエラー:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (err) {
    console.error(err);
    return null;
  }
};

// ---------- 作品リンク ----------

export const getNovelLinks = async (userId: string) => {
  const { data } = await supabase
    .from("novel_links")
    .select("*")
    .eq("user_id", userId);
  return data || [];
};

export const saveNovelLinks = async (userId: string, links: any[]) => {
  // 一度削除してから挿入
  await supabase.from("novel_links").delete().eq("user_id", userId);

  if (links.length === 0) return;

  const rows = links.map(l => ({
    user_id: userId,
    title: l.title,
    url: l.url
  }));

  return supabase.from("novel_links").insert(rows);
};

// ---------- SNSリンク ----------

export const getSocialLinks = async (userId: string) => {
  const { data } = await supabase
    .from("social_links")
    .select("*")
    .eq("user_id", userId);
  return data || [];
};

export const saveSocialLinks = async (userId: string, links: any[]) => {
  await supabase.from("social_links").delete().eq("user_id", userId);

  if (links.length === 0) return;

  const rows = links.map(l => ({
    user_id: userId,
    url: l.url
  }));

  return supabase.from("social_links").insert(rows);
};

export const getTotalWritingStats = async (userId: string) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("duration, words")
      .eq("user_id", userId)
  
    if (error) {
      console.error("stats error:", error)
      return { totalWords: 0, totalDuration: 0 }
    }
  
    const totalWords = data.reduce((sum, s) => sum + (s.words || 0), 0)
    const totalDuration = data.reduce((sum, s) => sum + (s.duration || 0), 0)
  
    return { totalWords, totalDuration }
  }
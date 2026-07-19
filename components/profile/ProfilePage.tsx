"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getProfile,
  getNovelLinks,
  getSocialLinks,
  saveProfile,
  saveNovelLinks,
  saveSocialLinks,
  uploadAvatar,
} from "@/lib/profile";

import { getTotalWritingStats } from "@/lib/profile";

import ProfileHeader from "@/components/profile/ProfileHeader";
import NovelLinks from "@/components/profile/NovelLinks";
import SocialLinks from "@/components/profile/SocialLinks";
import ProfileEditor from "@/components/profile/ProfileEditor";
import NovelLinksEditor from "@/components/profile/NovelLinksEditor";
import SocialLinksEditor from "@/components/profile/SocialLinksEditor";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [novelLinks, setNovelLinks] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [totalWords, setTotalWords] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)


  // プロフィール取得
  const fetchProfile = async () => {
    if (!user) return;

    const profileData = await getProfile(user.id);
    if (!profileData) return;

    setProfile(profileData);
    setUsername(profileData.username || "");
    setBio(profileData.bio || "");
    setAvatarUrl(profileData.avatar_url || "");

    const novelData = await getNovelLinks(user.id);
    setNovelLinks(novelData || []);
    const socialData = await getSocialLinks(user.id);
    setSocialLinks(socialData || []);

    const stats = await getTotalWritingStats(user.id);
    setTotalWords(stats.totalWords);
    setTotalDuration(stats.totalDuration);
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    console.log("保存前の UID:", user?.id);
    console.log("保存する avatarUrl:", avatarUrl);

    // プロフィール保存
    await saveProfile(user.id, username, bio, avatarUrl);
    await saveNovelLinks(user.id, novelLinks);
    await saveSocialLinks(user.id, socialLinks);

    setEditMode(false);
    fetchProfile();
  };

  // Supabase Auth からログインユーザー取得
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        console.log("ログインユーザーID:", data.user.id);
        setUser(data.user);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  if (!user) return null;
  if (!profile) return <div>プロフィール読み込み中...</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* プロフィール表示 */}
      <ProfileHeader username={username} bio={bio} avatarUrl={avatarUrl} />

      {!editMode && (
        <>
          <NovelLinks links={novelLinks} />
          <SocialLinks links={socialLinks} />

          <button
            onClick={() => setEditMode(true)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            プロフィール編集
          </button>
        </>
      )}

      {editMode && (
        <>
          <ProfileEditor
            username={username}
            setUsername={setUsername}
            bio={bio}
            setBio={setBio}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
          />

          <NovelLinksEditor links={novelLinks} setLinks={setNovelLinks} />
          <SocialLinksEditor links={socialLinks} setLinks={setSocialLinks} />

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-6 py-2 rounded"
            >
              保存
            </button>

            <button
              onClick={() => setEditMode(false)}
              className="bg-gray-400 text-white px-6 py-2 rounded"
            >
              キャンセル
            </button>
          </div>
        </>
      )}
    </div>
  );
}

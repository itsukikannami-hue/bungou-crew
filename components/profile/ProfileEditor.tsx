"use client";

import { useState, useEffect } from "react";
import { uploadAvatar } from "@/lib/profile";

interface Props {
  username: string;
  setUsername: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
}

export default function ProfileEditor({
  username,
  setUsername,
  bio,
  setBio,
  avatarUrl,
  setAvatarUrl
}: Props) {

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);

  // ファイル選択時に自動アップロード
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);

    if (!file) return;

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // アップロード
    setUploading(true);
    const url = await uploadAvatar(file);
    if (url) setAvatarUrl(url); // 親コンポーネントに反映
    setUploading(false);
  };

  return (
    <div className="bg-white border rounded-xl p-6 mt-4">

      <h2 className="text-lg font-bold mb-4">プロフィール編集</h2>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={previewUrl || "/default-avatar.png"}
          alt="avatar"
          className="w-20 h-20 rounded-full"
        />

        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {avatarFile && !uploading && (
            <span className="text-sm text-gray-500">保存時に自動アップロードされます</span>
          )}
          {uploading && <span className="text-sm text-blue-500">アップロード中…</span>}
        </div>
      </div>

      <input
        className="border p-2 w-full mb-3 rounded"
        placeholder="ユーザー名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <textarea
        className="border p-2 w-full mb-3 rounded"
        placeholder="プロフィール文"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />

      {/* 保存ボタンは ProfilePage で処理 */}
    </div>
  );
}

"use client"

import { useState } from "react"
import { saveProfile } from "@/lib/profile"

export default function ProfileEditor({ user, profile, onSaved }: any) {

  const [username,setUsername] = useState(profile?.username || "")
  const [bio,setBio] = useState(profile?.bio || "")
  const [avatar,setAvatar] = useState<File | null>(null)

  const handleSave = async () => {

    await saveProfile(
      user.id,
      username,
      bio,
      profile?.avatar_url || ""
    )

    onSaved()

  }

  return(

    <div className="bg-white border rounded-xl p-6 mt-4">

      <h2 className="text-lg font-bold mb-4">
        プロフィール編集
      </h2>

      <div className="flex items-center gap-4 mb-4">

        <img
          src={profile?.avatar_url || "/default-avatar.png"}
          className="w-20 h-20 rounded-full"
        />

        <input
          type="file"
          onChange={(e)=>setAvatar(e.target.files?.[0] || null)}
        />

      </div>

      <input
        className="border p-2 w-full mb-3 rounded"
        placeholder="ユーザー名"
        value={username}
        onChange={(e)=>setUsername(e.target.value)}
      />

      <textarea
        className="border p-2 w-full mb-3 rounded"
        placeholder="プロフィール文"
        value={bio}
        onChange={(e)=>setBio(e.target.value)}
      />

      <button
        onClick={handleSave}
        className="mt-6 bg-blue-500 text-white px-6 py-2 rounded"
      >
        保存
      </button>

    </div>

  )
}
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { use } from "react"

export default function AlbumDetail({ params }) {
  const { id: speciesId } = use(params)

  const [user, setUser] = useState(null)
  const [species, setSpecies] = useState(null)
  const [album, setAlbum] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      setUser(user)
  
      const { data: speciesData } = await supabase
        .from("bungou_species")
        .select("*")
        .eq("id", speciesId)
        .single()
  
      const { data: albumData } = await supabase
        .from("bungou_album")
        .select("*")
        .eq("species_id", speciesId)
        .eq("user_id", user.id)
        .maybeSingle()
  
      // 🔥 ここ追加
      const { data: instanceData } = await supabase
        .from("bungou_instances")
        .select("*")
        .eq("species_id", speciesId)
        .eq("user_id", user.id)
        .maybeSingle()
  
      setSpecies(speciesData)
      setAlbum(albumData)
    }
  
    fetchData()
  }, [speciesId])

  if (!user) return <div>ログインしてください</div>
  if (!species) return <div>読み込み中...</div>

  // =========================
  // 🧠 プロフィール切り替え
  // =========================

  const stage = album?.final_stage ?? instance?.stage ?? 0

  const profiles = []

  if (stage >= 1 && species?.profile_amateur) {
    profiles.push(species.profile_amateur)
  }
  
  if (stage >= 2 && species?.profile_semi) {
    profiles.push(species.profile_semi)
  }
  
  if (stage >= 3 && species?.profile_debut) {
    profiles.push(species.profile_debut)
  }

  return (
    <div className="p-6">

      <img
        src={species.image_url}
        className="w-40 mx-auto"
      />

      <h1 className="text-2xl font-bold text-center mt-4">
        {species.name}
      </h1>

      <div className="mt-6 whitespace-pre-wrap leading-relaxed space-y-4">
  {profiles.map((p, i) => (
    <p key={i}>{p}</p>
  ))}
</div>

      <div className="mt-4 text-sm text-gray-500">
        状態：
        {!album
  ? "未達成"
  : album.status === "debut"
    ? "デビュー成功"
    : "育成中"}
      </div>

    </div>
  )
}
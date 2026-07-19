"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default function AlbumPage() {

  const [album, setAlbum] = useState([])
  const [speciesList, setSpeciesList] = useState([])

  useEffect(() => {
    fetchAlbum()
  }, [])

  useEffect(() => {
    console.log("album updated:", album)
  }, [album])

  const fetchAlbum = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: speciesData } = await supabase
      .from("bungou_species")
      .select("*")

    const { data: albumData } = await supabase
      .from("bungou_album")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    console.log("speciesData:", speciesData)
    console.log("albumData:", albumData)

    setSpeciesList(speciesData || [])
    setAlbum(albumData || [])
  }

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        📚 ブンゴウアルバム
      </h1>

      <div className="grid grid-cols-4 gap-4">

        {speciesList.map(species => {

          const albumData = album.find(
            a => String(a.species_id) === String(species.id)
          )

          const stage = albumData?.final_stage ?? 0
          const unlocked = !!albumData

          return (
            <div key={species.id} className="border rounded-xl p-2 bg-white shadow">

              {!unlocked ? (
                <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                  ？
                </div>
              ) : (
                <Link href={`/album/${species.id}`}>
                  <div className="cursor-pointer">

                    <img
                      src={species.image_url}
                      className="aspect-square object-contain"
                      alt={species.name}
                    />

                    <div className="mt-2 text-center font-bold text-sm">
                      {species.name}
                    </div>

                    <div className="text-xs text-center text-gray-500">
                      {stage >= 3
                        ? "🎉 デビュー"
                        : stage >= 1
                        ? "📖 育成中"
                        : "🥚 孵化"}
                    </div>

                  </div>
                </Link>
              )}

            </div>
          )
        })}

      </div>

    </div>
  )
}
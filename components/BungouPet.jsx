"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function BungouPet() {

  const [bungou,setBungou] = useState(null)
  const [species,setSpecies] = useState(null)
  const [minutesToHatch,setMinutesToHatch] = useState(null)

  const fetchBungou = async () => {

    const { data:{user} } = await supabase.auth.getUser()
    if(!user) return


    const { data:instance } = await supabase
    .from("bungou_instances")
    .select("*")
    .eq("user_id",user.id)
    .eq("status","growing")
    .maybeSingle()

    if(!instance) return

    setBungou(instance)

    const { data:sp } = await supabase
      .from("bungou_species")
      .select("*")
      .eq("id",instance.species_id)
      .single()

    setSpecies(sp)
    calculateHatchTime(
      instance.total_words,
      instance.total_minutes
    )

  }

  useEffect(()=>{
    fetchBungou()
  },[])

  const calculateHatchTime = async (currentWords, currentMinutes) => {

    const { data:{user} } = await supabase.auth.getUser()
    if(!user) return
  
    const { data } = await supabase
      .from("sessions")
      .select("duration,words")
      .eq("user_id",user.id)
  
    if(!data || data.length === 0) return
  
    const totalWords = data.reduce((sum,s)=>sum+s.words,0)
    const totalMinutes = data.reduce((sum,s)=>sum+s.duration/60,0)
  
    if(totalMinutes === 0) return
  
    // 平均速度
    const wordsPerMinute = Math.max(10, totalWords / totalMinutes)
  
    // 残り文字
    const remainingWords = Math.max(0, 3000 - currentWords)
  
    // 文字ベースの残り時間
    const minutesFromWords = remainingWords / wordsPerMinute
  
    // 残り執筆時間
    const remainingMinutes = Math.max(0, 60 - currentMinutes)
  
    // 孵化までに必要な時間（遅い方）
    const minutesNeeded = Math.max(minutesFromWords, remainingMinutes)
  
    setMinutesToHatch(Math.ceil(minutesNeeded))
  
  }

  if(!bungou || !species){
    
    return <div>ブンゴウ読み込み中...</div>
  }
  const remainingWords = Math.max(0, 3000 - bungou.total_words)
  const remainingMinutes = Math.max(0, 60 - bungou.total_minutes)
  
  return (

    
    <div className="bg-white p-6 rounded-xl shadow-md mb-6">
  
      <h2 className="text-xl font-bold mb-2">
        🐣 現在のブンゴウ
      </h2>
  
      <div className="text-lg">
  
        {bungou.stage === 0
          ? "🥚 まだ眠っている卵..."
          : `📚 ${species.name}`}
  
      </div>
  
      <div className="text-sm text-gray-500">
  
        {bungou.stage === 0 && "孵化前"}
        {bungou.stage === 1 && "見習い作家"}
        {bungou.stage === 2 && "デビュー作家"}
  
      </div>
  
      <div className="mt-2 text-sm">
        文字数 {bungou.total_words}
      </div>
  
      <div className="text-sm">
        執筆時間 {bungou.total_minutes}分
      </div>
  
      {bungou.stage === 0 && (
  <div className="mt-2 text-sm text-gray-600">

<div>
  {remainingWords > 0 ? (
    <>孵化まで {remainingWords} 文字</>
  ) : (
    <span className="text-green-600 font-semibold">
      ✅ ノルマ文字数クリア！
    </span>
  )}
</div>

    {minutesToHatch !== null && (
      <div>
  {remainingMinutes > 0 ? (
    <>孵化まで {remainingMinutes} 分</>
  ) : (
    <span className="text-blue-600 font-semibold">
      ⏱ ノルマ時間クリア！
    </span>
  )}
</div>
)}
{remainingWords <= 0 && remainingMinutes <= 0 && (
  <div className="mt-2 text-orange-600 font-bold">
    🐣 孵化準備完了！
  </div>
)}   




  </div>
)}
  
    </div>
  
  )


}
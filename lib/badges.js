import { supabase } from "@/lib/supabaseClient"

export async function awardBadge(
  userId,
  badgeKey
) {

  // 既に取得済みか確認

  const { data: existing } =
    await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_key", badgeKey)
      .maybeSingle()

  if (existing) {
    return null
  }

  // 新規付与

  const { error } =
    await supabase
      .from("user_badges")
      .insert({
        user_id: userId,
        badge_key: badgeKey
      })

  if (error) {
    console.log(error)
    return null
  }

  return badgeKey
}

export async function checkFirstWrite(
    userId
  ) {
  
    const { count } =
      await supabase
        .from("writing_logs")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq("user_id", userId)
  
    if (count >= 1) {
  
      return await awardBadge(
        userId,
        "first_write"
      )
  
    }
  
    return null
  }

  export async function checkTotalWords(userId) {
    const { data } = await supabase
      .from("writing_logs")
      .select("words")
      .eq("user_id", userId)
  
    const totalWords =
      data?.reduce((sum, row) => sum + row.words, 0) || 0
  
    const badges = []
  
    if (totalWords >= 1000) badges.push("total_1000")
    if (totalWords >= 10000) badges.push("total_10000")
    if (totalWords >= 50000) badges.push("total_50000")
    if (totalWords >= 100000) badges.push("total_100000")
    if (totalWords >= 500000) badges.push("total_500000")
    if (totalWords >= 1000000) badges.push("total_1000000")
  
    return badges
  }

  export async function checkSingleWrite(words) {
    const badges = []
  
    if (words >= 3000) badges.push("single_3000")
    if (words >= 5000) badges.push("single_5000")
  
    return badges
  }

  export async function checkTotalHours(userId) {

    const { data } = await supabase
      .from("writing_logs")
      .select("minutes")
      .eq("user_id", userId)
  
    const totalMinutes =
      data?.reduce(
        (sum, row) => sum + row.minutes,
        0
      ) || 0
  
    const hours =
      totalMinutes / 60
  
    if (hours >= 100)
      return "hours_100"
  
    if (hours >= 10)
      return "hours_10"
  
    return null
  }

  export async function checkWritingStreak(userId) {

    const { data } = await supabase
      .from("writing_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
  
    if (!data?.length) return null
  
    const dates = [
      ...new Set(
        data.map(row =>
          row.created_at.slice(0, 10)
        )
      )
    ]
  
    let streak = 1
  
    for (let i = 1; i < dates.length; i++) {
  
      const prev = new Date(dates[i - 1])
      const current = new Date(dates[i])
  
      const diff =
        (prev - current) /
        (1000 * 60 * 60 * 24)
  
      if (diff === 1) {
        streak++
      }
      else {
        break
      }
    }
  
    if (streak >= 365)
    return await awardBadge(userId, "streak_365")
  
  if (streak >= 100)
    return await awardBadge(userId, "streak_100")
  
  if (streak >= 30)
    return await awardBadge(userId, "streak_30")
  
  if (streak >= 15)
    return await awardBadge(userId, "streak_15")
  
  if (streak >= 7)
    return await awardBadge(userId, "streak_7")
  
  if (streak >= 3)
    return await awardBadge(userId, "streak_3")
  
    return null
  }

  export async function checkGrowthBadges(
    userId,
    speciesId,
    stage
  ) {
  
    // 初孵化
    if (stage >= 1) {
      await awardBadge(
        userId,
        "first_hatch"
      )
    }
  
    // 初デビュー
    if (stage >= 3) {
      await awardBadge(
        userId,
        "first_debut"
      )
    }
  
    // 種族情報取得
    const { data: species } =
      await supabase
        .from("bungou_species")
        .select("rarity")
        .eq("id", speciesId)
        .single()
  
    if (species?.rarity === "rare") {
      await awardBadge(
        userId,
        "rare_birth"
      )
    }
  
  
    // 図鑑数チェック
    const { count } =
      await supabase
        .from("bungou_album")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq("user_id", userId)
  
    if (count >= 10) {
      await awardBadge(
        userId,
        "collector_10"
      )
    }
  
    if (count >= 30) {
      await awardBadge(
        userId,
        "collector_30"
      )
    }
  
    const { count: speciesCount } =
      await supabase
        .from("bungou_species")
        .select("*", {
          count: "exact",
          head: true
        })
  
    if (
      count &&
      speciesCount &&
      count >= speciesCount
    ) {
      await awardBadge(
        userId,
        "collector_all"
      )
    }
  }

  export async function checkFirstHatch(userId) {
    return await awardBadge(userId, "first_hatch")
  }
  
  export async function checkFirstDebut(userId) {
    return await awardBadge(userId, "first_debut")
  }
  
  export async function checkRareBirth(userId, speciesId) {
    const { data: species } = await supabase
      .from("bungou_species")
      .select("rarity")
      .eq("id", speciesId)
      .single()
  
    if (species?.rarity === "rare") {
      return await awardBadge(userId, "rare_birth")
    }
  
    return null
  }
  
  export async function checkCollector(userId) {
    const { count } = await supabase
      .from("bungou_album")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  
    const { count: speciesCount } = await supabase
      .from("bungou_species")
      .select("*", { count: "exact", head: true })
  
    if (!count || !speciesCount) return null
  
    if (count >= speciesCount) {
      return await awardBadge(userId, "collector_all")
    }
  
    if (count >= 30) return await awardBadge(userId, "collector_30")
    if (count >= 10) return await awardBadge(userId, "collector_10")
  
    return null
  }
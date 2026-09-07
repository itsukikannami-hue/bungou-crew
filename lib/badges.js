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

    // =========================
    // ① 実際の執筆日を取得
    // =========================
  
    const { data: writingLogs, error: writingError } =
      await supabase
        .from("writing_logs")
        .select("created_at")
        .eq("user_id", userId)
  
    if (writingError) {
      console.error(
        "WRITING LOG SELECT ERROR:",
        writingError
      )
  
      return null
    }
  
  
    // =========================
    // ② リカバリーした日を取得
    // =========================
  
    const {
      data: recoveryLogs,
      error: recoveryError,
    } = await supabase
      .from("streak_recoveries")
      .select("recovery_date")
      .eq("user_id", userId)
  
    if (recoveryError) {
      console.error(
        "STREAK RECOVERY SELECT ERROR:",
        recoveryError
      )
  
      return null
    }
  
  
    // =========================
    // ③ 執筆日をSetに入れる
    // =========================
  
    const writingDates = new Set(
      (writingLogs ?? []).map(row =>
        row.created_at.slice(0, 10)
      )
    )
  
  
    // =========================
    // ④ リカバリー日もSetに入れる
    // =========================
  
    const recoveryDates = new Set(
      (recoveryLogs ?? []).map(row =>
        row.recovery_date
      )
    )
  
  
    // =========================
    // ⑤ 執筆日＋リカバリー日を統合
    // =========================
  
    const dates = new Set([
      ...writingDates,
      ...recoveryDates,
    ])
  
  
    if (dates.size === 0) {
      return null
    }
  
  
    // =========================
    // ⑥ 日付を新しい順に並べる
    // =========================
  
    const sortedDates = [
      ...dates
    ].sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    )
  
  
    // =========================
    // ⑦ 今日から連続しているか確認
    // =========================
  
    const today = new Date()
  
    const todayString =
      today.toISOString().slice(0, 10)
  
  
    let currentDate = new Date(
      `${todayString}T00:00:00`
    )
  
    let streak = 0
  
  
    while (true) {
  
      const dateString =
        currentDate
          .toISOString()
          .slice(0, 10)
  
  
      if (!dates.has(dateString)) {
        break
      }
  
  
      streak++
  
  
      currentDate.setDate(
        currentDate.getDate() - 1
      )
    }
  
  
    console.log(
      "CURRENT STREAK:",
      streak
    )
  
  
    // =========================
    // ⑧ バッジ判定
    // =========================
  
    if (streak >= 365)
      return await awardBadge(
        userId,
        "streak_365"
      )
  
    if (streak >= 100)
      return await awardBadge(
        userId,
        "streak_100"
      )
  
    if (streak >= 30)
      return await awardBadge(
        userId,
        "streak_30"
      )
  
    if (streak >= 15)
      return await awardBadge(
        userId,
        "streak_15"
      )
  
    if (streak >= 7)
      return await awardBadge(
        userId,
        "streak_7"
      )
  
    if (streak >= 3)
      return await awardBadge(
        userId,
        "streak_3"
      )
  
  
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
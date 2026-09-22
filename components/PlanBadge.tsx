"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Plan = "free" | "premium" | "ultimate"

type PlanBadgeProps = {
  userId: string
}

const planCache = new Map<string, Plan>()

export default function PlanBadge({
  userId,
}: PlanBadgeProps) {
  const [plan, setPlan] = useState<Plan | null>(
    planCache.get(userId) ?? null
  )

  useEffect(() => {
    let cancelled = false

    const fetchPlan = async () => {
      const cachedPlan = planCache.get(userId)

      if (cachedPlan) {
        setPlan(cachedPlan)
        return
      }

      const { data, error } = await supabase.rpc(
        "get_user_plan",
        {
          target_user_id: userId,
        }
      )

      if (error) {
        console.error(
          "プラン情報取得エラー:",
          error
        )
        return
      }

      const resolvedPlan: Plan =
        data === "ultimate"
          ? "ultimate"
          : data === "premium"
          ? "premium"
          : "free"

      planCache.set(userId, resolvedPlan)

      if (!cancelled) {
        setPlan(resolvedPlan)
      }
    }

    fetchPlan()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (plan === "ultimate") {
    return (
      <span
        title="アルティメット会員"
        aria-label="アルティメット会員"
        className="
          inline-flex
          h-5
          w-5
          items-center
          justify-center
          rounded-full
          bg-gradient-to-br
          from-purple-500
          to-indigo-600
          text-[11px]
          font-bold
          text-white
          shadow-sm
          ring-2
          ring-purple-100
        "
      >
        ✓
      </span>
    )
  }

  if (plan === "premium") {
    return (
      <span
        title="プレミアム会員"
        aria-label="プレミアム会員"
        className="
          inline-flex
          h-5
          w-5
          items-center
          justify-center
          rounded-full
          bg-gradient-to-br
          from-blue-400
          to-blue-600
          text-[11px]
          font-bold
          text-white
          shadow-sm
          ring-2
          ring-blue-100
        "
      >
        ✓
      </span>
    )
  }

  return null
}
// components/GroupList.tsx
"use client"

import { useEffect, useState } from "react"
import { listGroups } from "@/lib/group"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface GroupListProps {
  userId: string
}

export default function GroupList({ userId }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!userId) return
    listGroups(userId).then(setGroups).catch(console.error)
  }, [userId])

  return (
<ul>
{groups.map(g => (
  <div
    key={g.id}
    className="p-2 border mb-1 cursor-pointer"
    onClick={() => router.push(`/group/${g.id}`)}
  >
    {g.name}
  </div>
))}
</ul>
  )
}
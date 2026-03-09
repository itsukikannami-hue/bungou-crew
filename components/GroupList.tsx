// components/GroupList.tsx
"use client"

import { useEffect, useState } from "react"
import { listGroups } from "@/lib/group"

interface GroupListProps {
  userId: string
}

export default function GroupList({ userId }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return
    listGroups(userId).then(setGroups).catch(console.error)
  }, [userId])

  return (
    <ul>
      {groups.map(g => (
        <li key={g.id}>{g.name}</li>
      ))}
    </ul>
  )
}
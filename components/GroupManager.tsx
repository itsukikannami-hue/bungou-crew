import { useState } from "react"
import { addMember, addMembers } from "@/lib/group"

export default function AddMemberUI({ groupId }: { groupId: string }) {
  const [friendId, setFriendId] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])

  // 単一追加
  const handleAdd = async () => {
    if (!friendId) return
    await addMember(groupId, friendId)
    setFriendId("")
    alert("メンバーを追加しました")
  }

  // 複数追加
  const handleAddMultiple = async () => {
    if (!selectedFriends.length) return
    await addMembers(groupId, selectedFriends)
    setSelectedFriends([])
    alert("複数メンバーを追加しました")
  }

  return (
    <div>
      <input
        placeholder="友達ID"
        value={friendId}
        onChange={e => setFriendId(e.target.value)}
      />
      <button onClick={handleAdd}>追加</button>

      {/* 複数追加のUI例 */}
      {/* チェックボックスで選択した友達を selectedFriends に入れて handleAddMultiple 呼ぶ */}
    </div>
  )
}
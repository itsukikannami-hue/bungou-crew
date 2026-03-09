"use client"

import { useState } from "react"
import { addMember, addMembers } from "@/lib/group"

type AddMemberUIProps = {
  groupId: string
}

export default function AddMemberUI({ groupId }: AddMemberUIProps) {
  const [friendId, setFriendId] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])

  // 単一追加
  const handleAdd = async () => {
    if (!friendId) return
    try {
      await addMember(groupId, friendId)
      alert(`友達 ${friendId} を追加しました`)
      setFriendId("")
    } catch (err) {
      console.error(err)
      alert("追加に失敗しました")
    }
  }

  // 複数追加
  const handleAddMultiple = async () => {
    if (!selectedFriends.length) return
    try {
      await addMembers(groupId, selectedFriends)
      alert(`複数メンバーを追加しました`)
      setSelectedFriends([])
    } catch (err) {
      console.error(err)
      alert("追加に失敗しました")
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 border rounded">
      <h3 className="font-bold">メンバー追加</h3>

      {/* 単一追加 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="友達ID"
          value={friendId}
          onChange={e => setFriendId(e.target.value)}
          className="border p-1 rounded"
        />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-2 rounded">
          追加
        </button>
      </div>

      {/* 複数追加のUI例（チェックボックス） */}
      {/* 適当な friendList があれば map して選択できる */}
      {/* <button onClick={handleAddMultiple}>選択した友達をまとめて追加</button> */}
    </div>
  )
}
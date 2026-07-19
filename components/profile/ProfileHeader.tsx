"use client"

interface Props {
    username: string
    bio: string
    avatarUrl: string
    totalWords: number
    totalDuration: number
  }
  
  export default function ProfileHeader({
    username,
    bio,
    avatarUrl,
    totalWords,
    totalDuration
  }: Props) {
  
    return (
  
      <div className="bg-white p-6 rounded-xl border">
  
        <img
          src={avatarUrl || "/default.png"}
          className="w-20 h-20 rounded-full mb-3"
        />
  
        <h2 className="text-xl font-bold">
          {username}
        </h2>
  
        <p className="text-gray-600">
          {bio}
        </p>

        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
    
        <div>
  <div className="font-bold text-lg">
    {(totalWords ?? 0).toLocaleString()}
  </div>
  <div>累計文字数</div>
</div>

<div>
  <div className="font-bold text-lg">
    {Math.floor((totalDuration ?? 0) / 3600)}時間
  </div>
  <div>累計執筆時間</div>
</div>

  </div>
  
      </div>





    )
  }
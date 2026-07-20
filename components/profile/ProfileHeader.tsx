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
  totalDuration,
}: Props) {
  return (
    <div className="bg-white p-6 rounded-xl border text-center">

      <img
        src={avatarUrl || "/default.png"}
        className="w-20 h-20 rounded-full mx-auto mb-3"
      />

      <h2 className="text-xl font-bold">
        {username}
      </h2>

      <p className="text-gray-600">
        {bio}
      </p>

      <div className="flex justify-center gap-8 mt-6 text-sm">

        <div>
          <div className="font-bold text-lg">
            {totalWords.toLocaleString()}
          </div>
          <div>総文字数</div>
        </div>

        <div>
          <div className="font-bold text-lg">
            {totalDuration}
          </div>
          <div>総執筆時間(分)</div>
        </div>

      </div>

    </div>
  )
}
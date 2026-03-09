"use client"

interface SessionModalProps {
  setShowModal: (v: boolean) => void
}

export default function SessionModal({ setShowModal }: SessionModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-8 rounded-xl flex flex-col gap-4 items-center">
        <h2 className="text-xl font-bold">執筆セッション終了！</h2>
        <input type="number" placeholder="執筆文字数" className="border p-2 text-center" />
        <button
          onClick={() => setShowModal(false)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          セッション保存
        </button>
      </div>
    </div>
  )
}
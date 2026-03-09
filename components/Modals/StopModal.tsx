"use client"

interface StopModalProps {
  setShowStopModal: (v: boolean) => void
  setShowModal: (v: boolean) => void
}

export default function StopModal({ setShowStopModal, setShowModal }: StopModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-8 rounded-xl flex flex-col gap-4 items-center">
        <h2 className="text-xl font-bold">執筆を終了しますか？</h2>
        <div className="flex gap-4">
          <button
            onClick={() => { setShowStopModal(false); setShowModal(true) }}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            終了
          </button>
          <button
            onClick={() => setShowStopModal(false)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            続ける
          </button>
        </div>
      </div>
    </div>
  )
}
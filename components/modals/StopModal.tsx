"use client"

interface StopModalProps {
  setShowStopModal: (v: boolean) => void
  setShowModal: (v: boolean) => void
}

export default function StopModal({ setShowStopModal, setShowModal }: StopModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white p-4 sm:p-8 rounded-xl flex flex-col gap-4 items-center">
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
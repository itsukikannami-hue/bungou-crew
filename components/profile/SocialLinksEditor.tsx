"use client"

interface Props {
  links: any[]
  setLinks: (links: any[]) => void
}

export default function SocialLinksEditor({ links, setLinks }: Props) {

  const addRow = () => {
    setLinks([...links, { url: "" }])
  }

  const updateItem = (i: number, value: string) => {
    const newLinks = [...links]
    newLinks[i].url = value
    setLinks(newLinks)
  }

  return (
    <div className="bg-white border rounded-xl p-6 mt-4">
      <h3 className="font-bold mb-3">🌐 SNS</h3>

      {links.map((item, i) => (
        <input
          key={i}
          placeholder="SNS URL"
          className="border p-2 w-full mb-2 rounded"
          value={item.url}
          onChange={(e) => updateItem(i, e.target.value)}
        />
      ))}

      <button
        onClick={addRow}
        className="bg-gray-300 px-3 py-1 rounded"
      >
        ＋追加
      </button>
    </div>
  )
}
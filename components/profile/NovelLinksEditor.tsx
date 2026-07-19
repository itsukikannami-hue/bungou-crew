"use client"

import { useState } from "react"
import { saveNovelLinks } from "@/lib/profile"

interface Props {
    links: any[]
    setLinks: (links:any[]) => void
  }
  
  export default function NovelLinksEditor({
    links,
    setLinks
  }: Props) {
  
    const addLink = () => {
  
      setLinks([
        ...links,
        { title:"", url:"" }
      ])
  
    }
  
    const updateLink = (
      index:number,
      field:string,
      value:string
    ) => {
  
      const newLinks = [...links]
  
      newLinks[index][field] = value
  
      setLinks(newLinks)
    }
  
    return (
  
      <div className="bg-white border rounded-xl p-6 mt-4">
        <h3 className="font-bold mb-2">
          📚 作品
        </h3>
  
        {links.map((l,index)=>(
          <div key={index} className="flex gap-2 mb-2">
  
            <input
              placeholder="作品タイトル"
              value={l.title}
              onChange={(e)=>
                updateLink(index,"title",e.target.value)
              }
              className="border p-2 rounded w-40"
            />
  
            <input
              placeholder="URL"
              value={l.url}
              onChange={(e)=>
                updateLink(index,"url",e.target.value)
              }
              className="border p-2 rounded w-64"
            />
  
          </div>
        ))}
  
        <button
          onClick={addLink}
          className="text-blue-500"
        >
          ＋追加
        </button>
  
      </div>
    )
  }
"use client"

interface Props {
    links:any[]
  }
  
  export default function NovelLinks({links}:Props){
  
    if(!links.length) return null
  
    return(
  
      <div className="bg-white border rounded-xl p-6 mt-4">
  
        {links.map((n:any)=>(
          <div key={n.id || n.url}>
            <a
              href={n.url}
              target="_blank"
              className="text-blue-500"
            >
              {n.title}
            </a>
          </div>
        ))}
  
      </div>
  
    )
  }
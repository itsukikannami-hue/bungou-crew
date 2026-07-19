"use client"

interface Props {
  links:any[]
}

export default function SocialLinks({links}:Props){

  if(!links.length) return null

  return(

    <div className="bg-white border rounded-xl p-6 mt-4">

      {links.map((s:any)=>(
        <div key={s.id || s.url}>
          <a
            href={s.url}
            target="_blank"
            className="text-blue-500"
          >
            {s.url}
          </a>
        </div>
      ))}

    </div>

  )
}
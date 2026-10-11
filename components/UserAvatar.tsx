"use client"

import { useState } from "react"
import type { ImgHTMLAttributes } from "react"

export const DEFAULT_AVATAR = "/default-avatar.svg"

type UserAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null }

/** 空URL・画像の読み込み失敗時に共通のデフォルトアイコンを表示。 */
export default function UserAvatar({ src, alt = "ユーザーアイコン", onError, ...props }: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = src?.trim() || DEFAULT_AVATAR
  return (
    <img
      {...props}
      src={failedSrc === url ? DEFAULT_AVATAR : url}
      alt={alt}
      onError={(event) => {
        if (url !== DEFAULT_AVATAR) setFailedSrc(url)
        onError?.(event)
      }}
    />
  )
}

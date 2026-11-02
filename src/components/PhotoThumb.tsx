import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/** Renders a stored photo blob from IndexedDB. */
export function PhotoThumb({
  photoId,
  className,
  alt
}: {
  photoId?: string
  className?: string
  alt: string
}) {
  const photo = useLiveQuery(() => (photoId ? db.photos.get(photoId) : undefined), [photoId])
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!(photo?.blob instanceof Blob)) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(photo.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [photo])

  if (!photoId) return null

  if (!url) {
    return (
      <div
        className={
          className ??
          'flex h-16 w-16 items-center justify-center rounded-lg border border-surface-line bg-surface-sunken text-[10px] text-ink-mute'
        }
      >
        Loading
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className ?? 'h-16 w-16 rounded-lg object-cover'}
    />
  )
}

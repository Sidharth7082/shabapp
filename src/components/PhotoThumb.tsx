import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
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
        className={clsx(
          'flex items-center justify-center bg-surface-sunken text-[9px] font-semibold uppercase tracking-wide text-ink-mute',
          className ?? 'h-16 w-16 rounded-lg border border-surface-line'
        )}
        aria-label={`${alt} photo unavailable`}
      >
        Photo
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

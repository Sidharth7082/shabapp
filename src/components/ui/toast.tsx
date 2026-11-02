import clsx from 'clsx'
import { create } from 'zustand'
import { AlertIcon, CheckIcon, SparkIcon, XIcon } from './icons'

type ToastTone = 'ok' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastStore {
  items: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  remove: (id: number) => void
}

let counter = 0

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, tone = 'info') => {
    const id = ++counter
    set((state) => ({ items: [...state.items, { id, message, tone }] }))
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    }, 4000)
  },
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
}))

export function toast(message: string, tone: ToastTone = 'info') {
  useToastStore.getState().push(message, tone)
}

export function Toaster() {
  const items = useToastStore((state) => state.items)
  const remove = useToastStore((state) => state.remove)

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={clsx(
            'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-elevated',
            item.tone === 'ok' && 'bg-brand-700 text-white',
            item.tone === 'error' && 'bg-danger text-white',
            item.tone === 'info' && 'bg-ink text-white'
          )}
        >
          <span className="mt-0.5 opacity-90">
            {item.tone === 'ok' ? (
              <CheckIcon size={18} />
            ) : item.tone === 'error' ? (
              <AlertIcon size={18} />
            ) : (
              <SparkIcon size={18} />
            )}
          </span>
          <p className="flex-1 leading-5">{item.message}</p>
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label="Dismiss notification"
            className="mt-0.5 rounded-md p-0.5 text-white/70 hover:text-white"
          >
            <XIcon size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

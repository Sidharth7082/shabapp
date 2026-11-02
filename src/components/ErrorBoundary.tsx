import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertIcon } from '@/components/ui/icons'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled app error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-sunken p-6">
        <div className="w-full max-w-sm rounded-3xl border border-surface-line bg-white p-6 text-center shadow-elevated">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <AlertIcon size={22} />
          </div>
          <h1 className="mt-3 text-[18px] font-extrabold tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-mute">
            Your jobs, photos and estimates are still stored on this device.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-[13px] font-bold text-white active:scale-[0.99]"
          >
            Reload app
          </button>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 w-full rounded-xl border border-surface-line px-4 py-3 text-[13px] font-bold text-ink-soft"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/settings'
            }}
            className="mt-2 w-full rounded-xl px-4 py-2 text-[12px] font-semibold text-brand-600"
          >
            Open settings
          </button>
        </div>
      </div>
    )
  }
}

'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[240px] px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-zinc-800 mb-1">Une erreur est survenue</p>
          <p className="text-xs text-zinc-400 mb-5 max-w-xs">
            Réessayez. Si le problème continue, contactez le secrétariat.
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={13} />
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

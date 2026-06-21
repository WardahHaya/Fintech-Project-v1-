import { Component, type ReactNode } from 'react'


interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isArabic =
      typeof document !== 'undefined' && document.documentElement.lang === 'ar'

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-navy">
            {isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate">
            {isArabic
              ? 'تعذّر عرض هذه الصفحة. حاول إعادة التحميل للمتابعة.'
              : 'This page could not be displayed. Try reloading to continue.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="action-primary mt-6 w-full justify-center"
          >
            {isArabic ? 'إعادة التحميل' : 'Reload'}
          </button>
        </div>
      </div>
    )
  }
}

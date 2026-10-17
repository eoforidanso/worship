import { Component } from 'react'

/**
 * Nothing that goes wrong in the app may show on the projector.
 *
 * `variant="screen"` (Output, Stage): a fault shows plain black — what the
 * congregation would see on Blackout — and the window quietly tries again
 * after a moment, so a one-off glitch heals itself mid-Mass.
 * `variant="page"` (operator tabs): the broken tab shows a short card with a
 * way back; the plan, the transport and the projector keep running.
 */
export default class SafeBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[safe]', error, info?.componentStack)
    if (this.props.variant === 'screen') {
      clearTimeout(this.retry)
      this.retry = setTimeout(() => this.setState({ error: null }), 2000)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.retry)
  }

  componentDidUpdate(prev) {
    // A new page (tab change) gets a fresh start.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.variant === 'screen')
      return <div style={{ position: 'fixed', inset: 0, background: '#000' }} />
    return (
      <div className="pad">
        <h2 className="celebration-name">This page hit a problem</h2>
        <p className="muted">
          The projector and the rest of the app are unaffected. Go back to Live, or reload this page.
        </p>
        <div className="row">
          <a className="btn btn-primary" href={`${import.meta.env.BASE_URL}live`}>
            Back to Live
          </a>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
        <pre className="muted small">{String(this.state.error?.message ?? this.state.error)}</pre>
      </div>
    )
  }
}

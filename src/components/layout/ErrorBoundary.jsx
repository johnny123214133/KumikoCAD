import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'

// Keeps one part of the app failing from blanking all of it: shows what went wrong
// and a way back (drops the live, unsaved pattern edits, which are what a bad
// setting would be sitting in) instead of an empty screen.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error)
  }

  reset = () => {
    usePatternStore.setState({ patternOverrides: {} })
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 p-4 text-center" role="alert" style={{ minWidth: 0 }}>
        <div className="fw-semibold mb-1">{this.props.label ?? 'This part'} ran into a problem</div>
        <div className="text-muted small mb-3" style={{ maxWidth: 420 }}>{String(this.state.error?.message ?? this.state.error)}</div>
        <button type="button" className="btn btn-sm btn-dark" onClick={this.reset}>Discard unsaved pattern edits and retry</button>
      </div>
    )
  }
}

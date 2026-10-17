import { useEffect } from 'react'
import { handleKeyDown } from './keyBindings.js'

// Installs the CAD's keyboard shortcuts (components/layout/keyBindings.js) on the document.
export default function useKeyBindings() {
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

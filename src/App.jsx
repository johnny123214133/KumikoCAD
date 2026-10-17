import React, { Suspense } from 'react'
import { ToastContainer, Slide } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Toolbar from './components/layout/Toolbar.jsx'
import LeftPanel from './components/layout/LeftPanel.jsx'
import RightPanel from './components/layout/RightPanel.jsx'
import CanvasLoader from './components/layout/CanvasLoader.jsx'
import { lazyWithMinimum } from './components/layout/lazyWithMinimum.js'
import ErrorBoundary from './components/layout/ErrorBoundary.jsx'
import { useTheme } from './store/useThemeStore.js'
import useKeyBindings from './components/layout/useKeyBindings.js'

// The canvas (and Konva with it) loads on its own: the toolbar and side panels are usable at
// once, and only the canvas area shows the loading animation while it arrives.
const Viewport = lazyWithMinimum(() => import('./components/layout/Viewport.jsx'))

export default function App() {
  const theme = useTheme()
  useKeyBindings()
  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-body">
        <LeftPanel />
        <ErrorBoundary label="The viewport"><Suspense fallback={<CanvasLoader delayMs={150} />}><Viewport /></Suspense></ErrorBoundary>
        <ErrorBoundary label="The side panel"><RightPanel /></ErrorBoundary>
      </div>
      {/* Mounted once at the app root — any component just calls
          toast.success/error/etc. from 'react-toastify' (see Inspector.jsx's
          Save Pattern flow) and it renders here. Requires `react-toastify`
          as a dependency (npm install react-toastify) if it isn't already
          one. */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        newestOnTop
        hideProgressBar
        closeOnClick={false}
        pauseOnHover
        draggable
        progress={undefined}
        theme={theme.mode}
        transition={Slide}
      />
    </div>
  )
}

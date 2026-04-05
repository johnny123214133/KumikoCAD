import React from 'react'
import Toolbar from './components/layout/Toolbar.jsx'
import LeftPanel from './components/layout/LeftPanel.jsx'
import RightPanel from './components/layout/RightPanel.jsx'
import Viewport from './components/layout/Viewport.jsx'

export default function App() {
  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-body">
        <LeftPanel />
        <Viewport />
        <RightPanel />
      </div>
    </div>
  )
}

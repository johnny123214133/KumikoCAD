import React from 'react'
import { ToastContainer, Slide } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
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
        theme="light"
        transition={Slide}
      />
    </div>
  )
}

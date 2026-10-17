import React from 'react'
import CanvasLoader from './CanvasLoader.jsx'

// The Cut List editor. It will list every strip a woodworker needs to build the panel
// (wood, finish, cuts, ...) with a 3D view of the selected kind of piece. Until then it
// shows the canvas loading animation, covering the stage underneath.
export default function CutListView() {
  return <CanvasLoader label="The cut list isn't built yet" />
}

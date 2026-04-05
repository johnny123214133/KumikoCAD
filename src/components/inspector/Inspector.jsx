import React from 'react'
import PatternInfo from './PatternInfo.jsx'
import CoordinatesTable from './CoordinatesTable.jsx'

export default function Inspector() {
  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-3" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Inspector</div>
      <PatternInfo />
      <hr className="my-3" />
      <CoordinatesTable />
    </div>
  )
}

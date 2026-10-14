import React from 'react'

// Small hand-drawn line-icon set for the toolbar. No icon library dependency
// was added for this — the project currently has none, so these are plain
// inline SVGs (24x24, stroke=currentColor) matching that.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const SelectionIcon = () => (
  <svg {...base}><path d="M5 3 L5 19 L9.5 15.5 L12.5 21 L15 19.5 L12 14 L19 14 Z" /></svg>
)

export const MultiSelectIcon = () => (
  <svg {...base}>
    <rect x="4" y="4" width="11" height="11" rx="1" strokeDasharray="2.5 2" />
    <rect x="10" y="10" width="11" height="11" rx="1" />
  </svg>
)

// Drag select: a dotted squiggle swept across the cells, ending in an arrow head.
export const DragSelectIcon = () => (
  <svg {...base}>
    <path d="M3 17 C5.5 7 9 7 11 12 S16.5 17 19 8" strokeDasharray="0.1 3.1" strokeWidth="2.4" />
    <path d="M15.6 7.6 L19.4 7.2 L20.2 11" />
  </svg>
)

// Help: a question mark in a circle.
export const HelpIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.4 A2.8 2.8 0 1 1 13.2 12 C12.3 12.5 12 13 12 14.2" />
    <circle cx="12" cy="17.3" r="0.7" fill="currentColor" stroke="none" />
  </svg>
)

// Validation: a check over a row of cells — two matching (filled) and one that isn't.
export const ValidationIcon = () => (
  <svg {...base}>
    <path d="M5 8.5 L9 12.5 L18 4" />
    <path d="M2.5 20 L7.5 20 L5 14.5 Z" fill="currentColor" fillOpacity="0.35" />
    <path d="M9.5 20 L14.5 20 L12 14.5 Z" fill="currentColor" fillOpacity="0.35" />
    <path d="M16.5 20 L21.5 20 L19 14.5 Z" />
  </svg>
)

export const FillPaintIcon = () => (
  <svg {...base}>
    <path d="M4 12 L12 4 L20 12 L12 20 Z" />
    <path d="M12 20 L12 20 C12 20 17 17.5 17 15 C17 13.6 15.9 12.5 14.5 12.5 C13.1 12.5 12 13.6 12 15" strokeDasharray="0" />
    <circle cx="18.5" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
)

export const LeftPanelIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <rect x="3" y="4" width="7" height="16" fill="currentColor" stroke="none" />
  </svg>
)

export const RightPanelIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" fill="currentColor" stroke="none" />
  </svg>
)

export const SaveProjectIcon = () => (
  <svg {...base}>
    <path d="M4 4 L16 4 L20 8 L20 20 L4 20 Z" />
    <path d="M8 4 L8 10 L16 10 L16 4" />
    <path d="M8 14 L16 14" />
    <path d="M8 17 L13 17" />
  </svg>
)

export const LoadProjectIcon = () => (
  <svg {...base}>
    <path d="M3 7 L9 7 L11 9.5 L21 9.5 L21 19 L3 19 Z" />
    <path d="M3 7 L3 19" />
  </svg>
)

export const ListViewIcon = () => (
  <svg {...base}>
    <rect x="3" y="4.5" width="4" height="4" rx="0.5" />
    <path d="M10 6.5 L21 6.5" />
    <rect x="3" y="10" width="4" height="4" rx="0.5" />
    <path d="M10 12 L21 12" />
    <rect x="3" y="15.5" width="4" height="4" rx="0.5" />
    <path d="M10 17.5 L21 17.5" />
  </svg>
)

export const GridViewIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="0.75" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="0.75" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="0.75" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="0.75" />
  </svg>
)

// A pattern triangle dropping into a grid cell outline — the panel editor's
// "place the currently-selected pattern into a cell" tool.
export const PlacePatternIcon = () => (
  <svg {...base}>
    <path d="M4 21 L20 21 L12 8 Z" />
    <path d="M12 2 L12 10" />
    <path d="M8.5 6.5 L12 10 L15.5 6.5" />
  </svg>
)

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="10" rx="1.5" />
    <path d="M8 11 L8 7 a4 4 0 0 1 8 0 L16 11" />
  </svg>
)

export const UnlockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="10" rx="1.5" />
    <path d="M8 11 L8 7 a4 4 0 0 1 7.4 -2" />
  </svg>
)


// Rotate the selected patterns 120° counterclockwise / clockwise.
export const RotateCcwIcon = () => (
  <svg {...base}>
    <path d="M5 12 A7 7 0 1 0 8 6.2" />
    <path d="M4.5 4 L7.8 6.4 L5.2 9.6" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor" stroke="none" fontFamily="sans-serif">120</text>
  </svg>
)

export const RotateCwIcon = () => (
  <svg {...base}>
    <path d="M19 12 A7 7 0 1 1 16 6.2" />
    <path d="M19.5 4 L16.2 6.4 L18.8 9.6" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor" stroke="none" fontFamily="sans-serif">120</text>
  </svg>
)

// Snap to Gridpoint: a joint where six cells meet, each turned toward it.
export const SnapGridpointIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="6.4" strokeDasharray="1.2 2.6" />
    {[0, 60, 120, 180, 240, 300].map(a => (
      <path key={a} d="M12 4.2 L12 7.6 M10.7 6.1 L12 7.6 L13.3 6.1" transform={`rotate(${a} 12 12)`} strokeWidth="1.3" />
    ))}
  </svg>
)

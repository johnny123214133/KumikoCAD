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

export const AreaSelectIcon = () => (
  <svg {...base}>
    <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="3 2.5" />
  </svg>
)

export const AlignGridIcon = () => (
  <svg {...base}>
    {[5, 12, 19].map(cx => [5, 12, 19].map(cy => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={cx === 12 && cy === 12 ? 2.2 : 1.2}
        fill={cx === 12 && cy === 12 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={cx === 12 && cy === 12 ? 0 : 1.4} />
    )))}
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

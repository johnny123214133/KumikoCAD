// Shared reference lists for wood species / finish dropdowns — used by both
// the grid strips (GridInspector) and pattern strips (Inspector) selectors.
// Starter list based on common kumiko/joinery material choices; the four
// built-in patterns currently all use 'hinoki' + 'natural', so both are
// included here. Extend as needed — nothing else depends on this being
// exhaustive.
export const WOOD_OPTIONS = [
  { id: 'hinoki', label: 'Hinoki (Japanese cypress)' },
  { id: 'sugi', label: 'Sugi (Japanese cedar)' },
  { id: 'keyaki', label: 'Keyaki (zelkova)' },
  { id: 'shina', label: 'Shina (basswood)' },
  { id: 'walnut', label: 'Walnut' },
  { id: 'cherry', label: 'Cherry' },
  { id: 'maple', label: 'Maple' },
  { id: 'sapele', label: 'Sapele' },
];

export const FINISH_OPTIONS = [
  { id: 'natural', label: 'Natural / unfinished' },
  { id: 'oiled', label: 'Oiled' },
  { id: 'lacquered', label: 'Lacquered' },
  { id: 'stained', label: 'Stained' },
  { id: 'wax', label: 'Wax' },
];

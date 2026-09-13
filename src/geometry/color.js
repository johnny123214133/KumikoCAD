// Small color utility — darkening a strip's own fill color for its
// selection border, rather than using one fixed color across every
// material (strip colors will vary once real wood/finish color mappings
// exist — see the request that prompted this: "we'll revisit it when we
// add the color mappings for all the wood and finish types").
export function darkenHex(hex, amount = 0.35) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
}

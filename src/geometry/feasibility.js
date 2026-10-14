// "Can this pattern actually be built with these settings?" — checked by building
// it, rather than by reasoning about one setting at a time.
//
// A setting's declared range (the cell width / 3 cap on strip width, a
// parameter's min/max) only accounts for what that setting does to the strip it
// controls. In a pattern whose strips depend on each other, a value inside its own
// range can still be impossible once every other strip has been placed (Futae- and
// Yae-asanoha's arrowhead stops fitting in the cell at wide strips, say) and the
// factory throws or produces non-finite geometry. So the limits the UI enforces
// are the declared ones tightened to the nearest value the whole pattern builds at.
//
// The feasible values are taken as one connected range around a value known to
// work, so the limit is found by bisection from there.

const finiteDeep = (v) => (typeof v === 'number' ? Number.isFinite(v)
  : v && typeof v === 'object' ? Object.values(v).every(finiteDeep) : true);

// Whether `factory(args)` builds without throwing and with finite geometry.
export function builds(factory, args) {
  try {
    const p = factory(args);
    return !!p && finiteDeep(p.strips) && finiteDeep(p.joints);
  } catch {
    return false;
  }
}

// The value nearest `limit` that still builds, searching from `good` (a value known
// to build) towards `limit`. `ok(v)` says whether v builds. Returns `limit` if it
// builds, else the best value found (to within `tol`), never past `good`.
export function furthestFeasible(ok, good, limit, tol = 0.05) {
  if (ok(limit)) return limit;
  let lo = good, hi = limit;
  for (let i = 0; i < 40 && Math.abs(hi - lo) > tol; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

// A pattern's widest buildable strip width, from the nominal `cap` down to `floor`.
// `args` is everything else the factory is called with (cell, grid strip, params).
// Rounded down to 0.05 mm so the limit isn't a long decimal.
export function maxFeasibleStripWidth(factory, args, floor, cap) {
  if (!(cap > floor)) return Math.max(floor, Math.min(cap, floor));
  const w = furthestFeasible((v) => builds(factory, { ...args, patternStripWidth: v }), floor, cap);
  return w === cap ? cap : Math.max(floor, Math.floor(w * 20) / 20);
}

// A parameter's feasible [min, max] within its declared [min, max], with every other
// setting (strip width, other params) as in `args`. `current` is its present value.
export function feasibleParamRange(factory, args, key, declared, current) {
  const at = (v) => builds(factory, { ...args, patternParams: { ...args.patternParams, [key]: { length: v, unit: 'mm' } } });
  const good = Number.isFinite(current) ? Math.min(Math.max(current, declared.min), declared.max) : declared.min;
  const goodOk = at(good);
  // If the present value itself doesn't build, nothing here can be trusted: report
  // the declared range and let the caller's fallback deal with it.
  if (!goodOk) return { ...declared, unverified: true };
  const max = Number.isFinite(declared.max) ? furthestFeasible(at, good, declared.max) : declared.max;
  const min = furthestFeasible(at, good, declared.min);
  const r2 = (x, up) => Number((up ? Math.floor(x * 20) / 20 : Math.ceil(x * 20) / 20).toFixed(2));
  return {
    min: min === declared.min ? min : Math.min(good, r2(min, false)),
    max: max === declared.max ? max : Math.max(good, r2(max, true)),
  };
}

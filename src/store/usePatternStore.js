import { create } from 'zustand';
import asanoha from '../patterns/asanoha.json';
import tsumiishiKikko from '../patterns/tsumiishi-kikko.json';
import goma from '../patterns/goma.json';
import mikado from '../patterns/mikado.json';
import blank from '../patterns/blank.json';
import { validatePattern } from '../geometry/schema/validate.js';
import { buildAsanoha } from '../geometry/factories/asanoha.js';
import { buildTsumiishiKikko } from '../geometry/factories/tsumiishiKikko.js';
import { buildGoma } from '../geometry/factories/goma.js';
import { buildMikado } from '../geometry/factories/mikado.js';
import { buildBlank } from '../geometry/factories/blank.js';
import useGridStore from './useGridStore.js';
import { MAX_STRIP_WIDTH_FRACTION } from '../geometry/units.js';

// NOTE: patterns/asanoha-one.json was previously imported here as a built-in.
// It's a 1-strip scratch/test file (not one of the four canonical patterns from
// the implementation plan) and fails validation — its joint j0 references strips
// s1/s2 that don't exist. Worse, it was BUILT_INS[0], so it was the pattern the
// app loaded by default, making the app look broken/empty on first launch. Removed.
//
// 'blank' is appended at the END deliberately — BUILT_INS[0] is what seeds the
// default activePatternId below, and an empty pattern being the default on
// first launch is exactly the bug that got fixed by removing asanoha-one.
const BUILT_INS = [asanoha, tsumiishiKikko, goma, mikado, blank];

BUILT_INS.forEach((p) => {
  const errs = validatePattern(p);
  if (errs.length) console.error(`[validation] ${p.id}:`, errs);
  else console.log(`[validation] ${p.id}: OK`);
});

// These static JSON files remain the templates (id, name, default
// patternParams, default stripProperties.width, meta) — but geometry
// (strips/joints/pieceTemplates/vertices/centroid) is now computed live by
// these factories from the current global dimensions, not read from the
// JSON. The JSON's own strips/joints/etc. arrays are effectively frozen
// reference snapshots at cellWidth=75/gridStripWidth=0 now; they're what
// each factory was verified against, not what's rendered.
const FACTORY_BY_ID = {
  'builtin:asanoha-sixth': buildAsanoha,
  'builtin:tsumiishi-kikko-sixth': buildTsumiishiKikko,
  'builtin:goma-sixth': buildGoma,
  'builtin:mikado-sixth': buildMikado,
  'builtin:blank': buildBlank,
};

function loadUserPatterns() {
  try { return JSON.parse(localStorage.getItem('kumiko_user_patterns') || '[]'); }
  catch { return []; }
}

const usePatternStore = create((set, get) => ({
  builtInPatterns: BUILT_INS,
  userPatterns: loadUserPatterns(),
  activePatternId: BUILT_INS[0].id,
  // Most-recent-first, capped at 5. Seeded with the initial pattern so the
  // "Recently used" list isn't empty on first load.
  recentPatternIds: [BUILT_INS[0].id],
  // Live per-pattern edits layered on top of each template's defaults —
  // { [patternId]: { patternStripWidth?: number, spacing?: {length,unit} } }.
  // Needed because built-in patterns are readOnly and there's still no
  // fork/save-to-user-pattern (see forkPattern/saveUserPattern below), but
  // strip width now needs to be genuinely live-editable and persist across
  // pattern/workspace switches within the session. This is also what makes
  // editing a pattern's width in the pattern editor automatically show up
  // everywhere that pattern is placed in the panel — both read the same
  // override through getComputedPattern/getEffectiveStripWidth.
  patternOverrides: {},
  setActivePattern: (id) => set((state) => ({
    activePatternId: id,
    recentPatternIds: [id, ...state.recentPatternIds.filter((pid) => pid !== id)].slice(0, 5),
  })),
  getActivePattern: () => {
    const { activePatternId } = get();
    return get().getComputedPattern(activePatternId);
  },
  // Returns the pattern's geometry computed fresh for the CURRENT global
  // cellWidth/gridStripWidth (from useGridStore) and this pattern's current
  // effective strip width/params (template default, or a live override).
  // Falls back to the template's static data untouched if there's no
  // factory for this id — the only way that happens today is a future
  // user-forked pattern, which doesn't exist yet (forkPattern is still a
  // TODO); once forking is real this fallback needs revisiting so forked
  // patterns also recompute rather than staying frozen at fork time.
  getComputedPattern: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    if (!template) return state.builtInPatterns[0];
    const build = FACTORY_BY_ID[id];
    if (!build) return template;
    const { cellWidth, gridStripWidth } = useGridStore.getState();
    const overrides = state.patternOverrides[id] || {};
    const patternStripWidth = overrides.patternStripWidth ?? template.stripProperties?.[0]?.width ?? 6;
    const patternParams = overrides.spacing
      ? { ...template.patternParams, spacing: overrides.spacing }
      : template.patternParams;
    return build({ cellWidth, gridStripWidth, patternStripWidth, patternParams });
  },
  getEffectiveStripWidth: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.patternStripWidth ?? template?.stripProperties?.[0]?.width ?? 6;
  },
  // Ignores 0/negative — "don't update the render when set to 0" — and
  // clamps to the current cellWidth/3 limit.
  setPatternStripWidth: (id, width) => {
    if (!(width > 0)) return;
    const { cellWidth } = useGridStore.getState();
    const max = cellWidth * MAX_STRIP_WIDTH_FRACTION;
    const clamped = Math.min(width, max);
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], patternStripWidth: clamped } },
    }));
  },
  setPatternSpacing: (id, length, unit) => {
    if (!(length > 0)) return;
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], spacing: { length, unit } } },
    }));
  },
  // Sweeps every pattern currently "in use" (the active one, plus every
  // distinct pattern id placed anywhere in the grid) and clamps its strip
  // width down if it now exceeds the new cellWidth/3. Called by
  // useGridStore.setCellWidth on shrink — see that file. The brainstorm
  // asked for the active pattern to be prioritized and the rest to follow;
  // this does them all in one synchronous pass, which is fine at today's
  // scale (this is just number bookkeeping) — real prioritization/batching
  // will matter once Phase 3's per-pattern render caching exists and
  // reclamping means regenerating cached images, not just numbers.
  clampAllStripWidths: () => {
    const state = get();
    const { cellWidth, spacePatterns } = useGridStore.getState();
    const max = cellWidth * MAX_STRIP_WIDTH_FRACTION;
    const idsToCheck = [state.activePatternId, ...new Set(Object.values(spacePatterns))];
    const allPatterns = [...state.builtInPatterns, ...state.userPatterns];
    let changed = false;
    const nextOverrides = { ...state.patternOverrides };
    for (const id of idsToCheck) {
      const template = allPatterns.find(p => p.id === id);
      const current = nextOverrides[id]?.patternStripWidth ?? template?.stripProperties?.[0]?.width;
      if (current != null && current > max) {
        nextOverrides[id] = { ...nextOverrides[id], patternStripWidth: max };
        changed = true;
      }
    }
    if (changed) set({ patternOverrides: nextOverrides });
  },
  forkPattern: (id) => { /* TODO */ },
  saveUserPattern: (pattern) => { /* TODO */ },
  deleteUserPattern: (id) => { /* TODO */ },
}));

export default usePatternStore;

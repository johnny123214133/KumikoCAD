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
import useSelectionStore from './useSelectionStore.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../geometry/units.js';
import { getMaterialColor } from '../geometry/woodFinishColors.js';

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

// Layers per-strip material/finish overrides onto a freshly-built pattern,
// for the "connect wood/finish changes to the strip(s) selected" request —
// wood/finish previously only ever applied to the WHOLE pattern (one shared
// stripProperties[0] entry every strip's pieceTemplate pointed at). Rather
// than touching the factories/geometry pipeline at all, this reuses the
// existing stripProperties/pieceTemplates indirection they already produce:
// strips needing a color different from the pattern's default get pointed
// at their OWN stripProperties entry (one entry per distinct material+finish
// combination actually in use, not one per overridden strip, so ten strips
// all overridden to the same wood+finish share a single entry) instead of
// the shared default one. computeStripRenderData (geometry/renderPattern.js)
// already resolves a strip's color by looking up
// pieceTemplate.stripPropertyId in stripProperties — completely unchanged
// by this, since from its point of view these are just more stripProperties
// entries like any pattern already has.
//
// `stripOverrides` is `{ [stripId]: { material?, finish? } }` — either field
// can be missing (e.g. only material was ever overridden for that strip),
// in which case it falls back to the pattern's own resolved default
// material/finish, not to some other strip's override.
function applyStripColorOverrides(pattern, stripOverrides, defaultMaterial, defaultFinish) {
  const nextStripProperties = [...pattern.stripProperties];
  const spByKey = new Map(nextStripProperties.map((sp) => [`${sp.material}:${sp.finish}`, sp.id]));
  let n = nextStripProperties.length;

  const nextPieceTemplates = pattern.pieceTemplates.map((pt) => {
    const override = stripOverrides[pt.stripId];
    if (!override) return pt;
    const material = override.material ?? defaultMaterial;
    const finish = override.finish ?? defaultFinish;
    const key = `${material}:${finish}`;
    let spId = spByKey.get(key);
    if (!spId) {
      const base = pattern.stripProperties.find((sp) => sp.id === pt.stripPropertyId) ?? pattern.stripProperties[0];
      spId = `sp-strip-override-${n++}`;
      nextStripProperties.push({ ...base, id: spId, material, finish, color: getMaterialColor(material, finish) });
      spByKey.set(key, spId);
    }
    return { ...pt, stripPropertyId: spId };
  });

  return { ...pattern, stripProperties: nextStripProperties, pieceTemplates: nextPieceTemplates };
}

// Every factory (buildAsanoha, buildGoma, ...) hardcodes ITS OWN id/name/
// readOnly in its return object (they were written before any pattern could
// be anything other than one of the five built-ins, where that hardcoded
// value always happens to match the template anyway). For a SAVED user
// pattern — which reuses a built-in's factory via basePatternId, see
// getComputedPattern/getCanonicalPattern — that means the computed object
// coming back from build() silently claims to BE the base built-in
// (id/name/readOnly and all), not the actual saved pattern. Reported as
// "the pattern name in the right panel doesn't match the (correct) name
// shown in the left panel's pattern list" — the left panel reads name
// straight off the template/store entry, the right panel was reading it off
// this mislabeled computed object instead. Restoring the REAL identity here
// is the one place both getComputedPattern and getCanonicalPattern need it.
function withTemplateIdentity(computed, template) {
  return { ...computed, id: template.id, name: template.name, readOnly: !!template.readOnly };
}

// Merges a saved pattern's own baked-in per-strip overrides (template.
// stripMaterialOverrides — set when a pattern is created via Save Pattern,
// see saveUserPattern below) with this session's live, further edits on top
// of it (patternOverrides[id].stripMaterials) — field by field, so live
// session edits win per-field but don't erase the other field of the same
// strip's saved override (e.g. the pattern was saved with strip s3 set to
// walnut/stained, and this session only changed s3's finish to oiled — s3
// should resolve to walnut/oiled, not lose its material).
function mergeStripMaterials(saved, live) {
  if (!saved && !live) return {};
  const out = {};
  for (const stripId of new Set([...Object.keys(saved || {}), ...Object.keys(live || {})])) {
    out[stripId] = { ...(saved?.[stripId]), ...(live?.[stripId]) };
  }
  return out;
}

// A comparable fingerprint of "what makes this pattern's appearance/geometry
// recipe distinct" — used by saveUserPattern's duplicate check. Per-strip
// overrides are sorted by strip id first so two recipes with the same
// overrides specified in a different order still compare equal.
function recipeKey(recipe) {
  const stripEntries = Object.entries(recipe.stripMaterials || {})
    .filter(([, v]) => v && (v.material || v.finish))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, v]) => `${id}:${v.material ?? ''}:${v.finish ?? ''}`)
    .join(',');
  const spacingKey = recipe.spacing ? `${recipe.spacing.length}${recipe.spacing.unit}` : '';
  return [recipe.basePatternId, recipe.patternStripWidth, recipe.material, recipe.finish, spacingKey, stripEntries].join('|');
}

// Splits a name into its non-numeric prefix and trailing integer (if any) —
// "Asanoha Walnut 3" -> ["Asanoha Walnut ", 3], "Asanoha Walnut" -> ["Asanoha Walnut", null].
function splitTrailingNumber(name) {
  const m = /^(.*?)(\d+)$/.exec(name);
  return m ? [m[1], parseInt(m[2], 10)] : [name, null];
}

// "If a name is already taken, append a 1 to the end if the existing name
// does not end in a number, otherwise increment it" — bumps a taken name to
// its next candidate, then the caller re-checks and bumps again as needed
// until a free name is found (handles "Foo" -> "Foo1" -> "Foo2" -> ...).
function bumpName(name) {
  const [prefix, n] = splitTrailingNumber(name);
  return n === null ? `${prefix}1` : `${prefix}${n + 1}`;
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
  // Switching the active pattern also clears the active strip selection
  // (useSelectionStore) — same rule as useAppStore's setWorkspace/
  // setActiveTool: a selection made against one pattern's strips shouldn't
  // silently carry over and apply to a different pattern's strips.
  setActivePattern: (id) => {
    useSelectionStore.getState().clearSelection();
    set((state) => ({
      activePatternId: id,
      recentPatternIds: [id, ...state.recentPatternIds.filter((pid) => pid !== id)].slice(0, 5),
    }));
  },
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
    // A pattern saved via saveUserPattern isn't its own geometry algorithm —
    // it's a named preset of one of the five built-in shapes, recorded via
    // basePatternId so it keeps recomputing live off the CURRENT
    // cellWidth/gridStripWidth (like every other pattern) instead of being
    // frozen at whatever dimensions were active when it was saved.
    const build = FACTORY_BY_ID[template.basePatternId ?? id];
    if (!build) return template;
    const { cellWidth, gridStripWidth } = useGridStore.getState();
    const overrides = state.patternOverrides[id] || {};
    const patternStripWidth = overrides.patternStripWidth ?? template.stripProperties?.[0]?.width ?? 6;
    const material = overrides.material ?? template.stripProperties?.[0]?.material ?? 'hinoki';
    const finish = overrides.finish ?? template.stripProperties?.[0]?.finish ?? 'natural';
    const patternParams = overrides.spacing
      ? { ...template.patternParams, spacing: overrides.spacing }
      : template.patternParams;
    const computed = withTemplateIdentity(build({ cellWidth, gridStripWidth, patternStripWidth, patternParams, material, finish }), template);
    const stripMaterials = mergeStripMaterials(template.stripMaterialOverrides, overrides.stripMaterials);
    if (Object.keys(stripMaterials).length) {
      return applyStripColorOverrides(computed, stripMaterials, material, finish);
    }
    return computed;
  },
  // Same as getComputedPattern, EXCEPT it ignores this session's live
  // patternOverrides entirely — only the template's own saved/baked-in
  // recipe (width, material, finish, per-strip overrides). Still reactive
  // to the grid's actual current cellWidth/gridStripWidth, since those are
  // panel-wide, not something being live-edited per-pattern in the right
  // panel. This is what the pattern library's icon (PatternIcon.jsx) reads
  // instead of getComputedPattern — "the icon for the current pattern
  // shouldn't update as parameters change, only when saving a new pattern":
  // an icon that redrew on every keystroke in the Inspector made an
  // in-progress, not-yet-saved edit look like it had already become a
  // separate library entry.
  getCanonicalPattern: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    if (!template) return state.builtInPatterns[0];
    const build = FACTORY_BY_ID[template.basePatternId ?? id];
    if (!build) return template;
    const { cellWidth, gridStripWidth } = useGridStore.getState();
    const patternStripWidth = template.stripProperties?.[0]?.width ?? 6;
    const material = template.stripProperties?.[0]?.material ?? 'hinoki';
    const finish = template.stripProperties?.[0]?.finish ?? 'natural';
    const computed = withTemplateIdentity(build({ cellWidth, gridStripWidth, patternStripWidth, patternParams: template.patternParams, material, finish }), template);
    const stripMaterials = template.stripMaterialOverrides;
    if (stripMaterials && Object.keys(stripMaterials).length) {
      return applyStripColorOverrides(computed, stripMaterials, material, finish);
    }
    return computed;
  },
  getEffectiveStripWidth: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.patternStripWidth ?? template?.stripProperties?.[0]?.width ?? 6;
  },
  getEffectiveMaterial: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.material ?? template?.stripProperties?.[0]?.material ?? 'hinoki';
  },
  getEffectiveFinish: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.finish ?? template?.stripProperties?.[0]?.finish ?? 'natural';
  },
  // Per-STRIP material/finish — checks this session's live override first,
  // then a saved pattern's own baked-in per-strip override (template.
  // stripMaterialOverrides, set by Save Pattern), then falls back to the
  // pattern-wide effective value (getEffectiveMaterial/Finish above).
  getEffectiveStripMaterial: (id, stripId) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.stripMaterials?.[stripId]?.material
      ?? template?.stripMaterialOverrides?.[stripId]?.material
      ?? state.getEffectiveMaterial(id);
  },
  getEffectiveStripFinish: (id, stripId) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return state.patternOverrides[id]?.stripMaterials?.[stripId]?.finish
      ?? template?.stripMaterialOverrides?.[stripId]?.finish
      ?? state.getEffectiveFinish(id);
  },
  // Ignores 0/negative — "don't update the render when set to 0" — and
  // clamps to the current cellWidth/3 limit, with a hard 1mm floor
  // ("always ensure the lower bound is 1 millimeter").
  setPatternStripWidth: (id, width) => {
    if (!(width > 0)) return;
    const { cellWidth } = useGridStore.getState();
    const max = cellWidth * MAX_STRIP_WIDTH_FRACTION;
    const clamped = Math.max(Math.min(width, max), MIN_STRIP_WIDTH_MM);
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], patternStripWidth: clamped } },
    }));
  },
  setPatternMaterial: (id, material) => {
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], material } },
    }));
  },
  setPatternFinish: (id, finish) => {
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], finish } },
    }));
  },
  // Sets material/finish for ONE strip within a pattern — used when the
  // Inspector's Wood/Finish selectors should target the currently-selected
  // strip(s) rather than the whole pattern (see setStripsMaterial/Finish
  // below, which apply this across a selection).
  setStripMaterial: (id, stripId, material) => {
    set((state) => {
      const patternOv = state.patternOverrides[id] || {};
      const stripMaterials = { ...patternOv.stripMaterials, [stripId]: { ...patternOv.stripMaterials?.[stripId], material } };
      return { patternOverrides: { ...state.patternOverrides, [id]: { ...patternOv, stripMaterials } } };
    });
  },
  setStripFinish: (id, stripId, finish) => {
    set((state) => {
      const patternOv = state.patternOverrides[id] || {};
      const stripMaterials = { ...patternOv.stripMaterials, [stripId]: { ...patternOv.stripMaterials?.[stripId], finish } };
      return { patternOverrides: { ...state.patternOverrides, [id]: { ...patternOv, stripMaterials } } };
    });
  },
  // Batch versions for a multi-strip selection — applied one strip at a
  // time via setStripMaterial/Finish's own logic (each strip keeps whatever
  // its OTHER field currently resolves to; only the changed field moves) in
  // a single store update rather than N separate `set()` calls.
  setStripsMaterial: (id, stripIds, material) => {
    set((state) => {
      const patternOv = state.patternOverrides[id] || {};
      const stripMaterials = { ...patternOv.stripMaterials };
      stripIds.forEach((stripId) => {
        stripMaterials[stripId] = { ...stripMaterials[stripId], material };
      });
      return { patternOverrides: { ...state.patternOverrides, [id]: { ...patternOv, stripMaterials } } };
    });
  },
  setStripsFinish: (id, stripIds, finish) => {
    set((state) => {
      const patternOv = state.patternOverrides[id] || {};
      const stripMaterials = { ...patternOv.stripMaterials };
      stripIds.forEach((stripId) => {
        stripMaterials[stripId] = { ...stripMaterials[stripId], finish };
      });
      return { patternOverrides: { ...state.patternOverrides, [id]: { ...patternOv, stripMaterials } } };
    });
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
  // A pattern's own CANONICAL recipe — its saved/baked-in defaults, ignoring
  // this session's live patternOverrides entirely. Used as the "nothing's
  // changed yet" baseline (hasUnsavedChanges) and as what a duplicate-check
  // compares an about-to-be-saved recipe against for every OTHER pattern.
  getTemplateRecipe: (template) => ({
    basePatternId: template.basePatternId ?? template.id,
    patternStripWidth: template.stripProperties?.[0]?.width ?? 6,
    material: template.stripProperties?.[0]?.material ?? 'hinoki',
    finish: template.stripProperties?.[0]?.finish ?? 'natural',
    spacing: template.patternParams?.spacing ?? null,
    stripMaterials: template.stripMaterialOverrides ?? {},
  }),
  // The CURRENTLY EFFECTIVE recipe for a pattern id — its own canonical
  // recipe with this session's live patternOverrides layered on top. This
  // is "what Save Pattern would actually save right now."
  getCurrentRecipe: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    if (!template) return null;
    const ov = state.patternOverrides[id] || {};
    const base = state.getTemplateRecipe(template);
    return {
      basePatternId: base.basePatternId,
      patternStripWidth: ov.patternStripWidth ?? base.patternStripWidth,
      material: ov.material ?? base.material,
      finish: ov.finish ?? base.finish,
      spacing: ov.spacing ?? base.spacing,
      stripMaterials: mergeStripMaterials(base.stripMaterials, ov.stripMaterials),
    };
  },
  // Save Pattern is disabled until this is true — "disable the save pattern
  // button until the parameters are updated" from a freshly-selected
  // pattern's own baseline. Deliberately compares against the pattern's own
  // canonical recipe rather than tracking "since selection" with a ref/
  // effect: if the effective recipe exactly matches what's already saved,
  // there is nothing new to save, whether that's because nothing was
  // touched yet or because it was touched and changed back.
  hasUnsavedChanges: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    if (!template) return false;
    return recipeKey(state.getCurrentRecipe(id)) !== recipeKey(state.getTemplateRecipe(template));
  },
  // Resolves name collisions per the spec: if `desiredName` is taken, and
  // the taken name doesn't end in a number, append "1"; if it does, bump
  // that number — repeating against the new candidate until free.
  generateUniqueName: (desiredName) => {
    const state = get();
    const taken = new Set([...state.builtInPatterns, ...state.userPatterns].map(p => p.name));
    let candidate = desiredName;
    while (taken.has(candidate)) candidate = bumpName(candidate);
    return candidate;
  },
  // Saves the active pattern's CURRENT effective recipe (whole-pattern strip
  // width/material/finish/spacing, plus any per-strip material/finish
  // overrides) as a brand new named pattern in the library. Returns
  // { ok: true, id, name } on success, or { ok: false, reason: 'duplicate',
  // existingName } if an existing pattern (built-in or user) already has
  // this exact recipe — the caller (Inspector.jsx) is responsible for
  // surfacing that as an alert to the user.
  //
  // The new pattern is NOT its own geometry — it records basePatternId (see
  // getComputedPattern) so it recomputes live from the same factory as its
  // source shape, at whatever cellWidth/gridStripWidth is active, exactly
  // like the five built-ins do. Per-strip overrides are baked into the new
  // template's own stripMaterialOverrides field, not left living only in
  // this session's ephemeral patternOverrides, so they survive a reload the
  // same way the pattern's own name/width/material/finish do (userPatterns
  // is persisted to localStorage below; patternOverrides currently isn't —
  // a pre-existing gap, not something this introduces).
  saveUserPattern: (desiredName) => {
    const state = get();
    const id = state.activePatternId;
    const allPatterns = [...state.builtInPatterns, ...state.userPatterns];
    const template = allPatterns.find(p => p.id === id);
    if (!template) return { ok: false, reason: 'no-active-pattern' };

    const recipe = state.getCurrentRecipe(id);
    const recipeK = recipeKey(recipe);
    const duplicate = allPatterns.find(p => p.id !== id && recipeKey(state.getTemplateRecipe(p)) === recipeK);
    if (duplicate) return { ok: false, reason: 'duplicate', existingName: duplicate.name };

    const name = state.generateUniqueName((desiredName || '').trim() || `${template.name} copy`);
    const newId = `user:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const newTemplate = {
      id: newId,
      name,
      readOnly: false,
      basePatternId: recipe.basePatternId,
      patternParams: recipe.spacing ? { spacing: recipe.spacing } : {},
      stripProperties: [{
        id: 'sp0',
        width: recipe.patternStripWidth,
        thickness: 6.0,
        material: recipe.material,
        grain: 'along',
        color: getMaterialColor(recipe.material, recipe.finish),
        finish: recipe.finish,
        edgeProfile: null,
      }],
      stripMaterialOverrides: recipe.stripMaterials,
    };

    set((s) => {
      const nextUserPatterns = [...s.userPatterns, newTemplate];
      try { localStorage.setItem('kumiko_user_patterns', JSON.stringify(nextUserPatterns)); }
      catch { /* localStorage unavailable — pattern still exists for this session */ }
      return { userPatterns: nextUserPatterns };
    });

    return { ok: true, id: newId, name };
  },
  forkPattern: (id) => { /* TODO */ },
  deleteUserPattern: (id) => { /* TODO */ },
}));

export default usePatternStore;

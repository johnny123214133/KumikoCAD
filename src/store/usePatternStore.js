import { create } from 'zustand';
import asanoha from '../patterns/asanoha.json';
import tsumiishiKikko from '../patterns/tsumiishi-kikko.json';
import goma from '../patterns/goma.json';
import mikado from '../patterns/mikado.json';
import kurumaKikko from '../patterns/kuruma-kikko.json';
import kurumaKikkoTriangle from '../patterns/kuruma-kikko-triangle.json';
import sakura from '../patterns/sakura.json';
import sakuraA from '../patterns/sakura-a.json';
import mitsukude from '../patterns/mitsukude.json';
import matsuba from '../patterns/matsuba.json';
import bishamonKikkoA from '../patterns/bishamon-kikko-a.json';
import bishamonKikkoB from '../patterns/bishamon-kikko-b.json';
import matsunoha from '../patterns/matsunoha.json';
import rindo from '../patterns/rindo.json';
import kawariYaeZakura from '../patterns/kawari-yae-zakura.json';
import yaeZakuraKikko from '../patterns/yae-zakura-kikko.json';
import tsunoAsanoha from '../patterns/tsuno-asanoha.json';
import yaeAsanoha from '../patterns/yae-asanoha.json';
import tsunoAsanohaPointed from '../patterns/tsuno-asanoha-pointed.json';
import kikyoAsanoha from '../patterns/kikyo-asanoha.json';
import kawariGoma from '../patterns/kawari-goma.json';
import kawariGomaVariant from '../patterns/kawari-goma-variant.json';
import kawariUrahanaKikko from '../patterns/kawari-urahana-kikko.json';
import rindoAsanoha from '../patterns/rindo-asanoha.json';
import sakuraKikkoA from '../patterns/sakura-kikko-a.json';
import sakuraKikkoB from '../patterns/sakura-kikko-b.json';
import kazaGurumaA from '../patterns/kaza-guruma-a.json';
import kazaGurumaB from '../patterns/kaza-guruma-b.json';
import rindoTsanugiA from '../patterns/rindo-tsanugi-a.json';
import rindoTsanugiB from '../patterns/rindo-tsanugi-b.json';
import ryusoKikkoA from '../patterns/ryuso-kikko-a.json';
import ryusoKikkoB from '../patterns/ryuso-kikko-b.json';
import mikadoVariant from '../patterns/mikado-variant-a.json';
import komachiKikkoA from '../patterns/komachi-kikko-a.json';
import komachiKikkoB from '../patterns/komachi-kikko-b.json';
import ryusoAsanohaA from '../patterns/ryuso-asanoha-a.json';
import ryusoAsanohaB from '../patterns/ryuso-asanoha-b.json';
import futaeAsanoha from '../patterns/futae-asanoha.json';
import kawariAsanoha from '../patterns/kawari-asanoha.json';
import warigikuKikko from '../patterns/warigiku-kikko.json';
import oumeKikko from '../patterns/oume-kikko.json';
import seiunKikko from '../patterns/seiun-kikko.json';
import mitsuBishi from '../patterns/mitsu-bishi.json';
import urahanaKikko from '../patterns/urahana-kikko.json';
import yaeUrahanaKikko from '../patterns/yae-urahana-kikko.json';
import shippo from '../patterns/shippo.json';
import bishamonKikkoInsetA from '../patterns/bishamon-kikko-inset-a.json';
import bishamonKikkoInsetB from '../patterns/bishamon-kikko-inset-b.json';
import sakuraShippo from '../patterns/sakura-shippo.json';
import sokutenKikko from '../patterns/sokuten-kikko.json';
import ume from '../patterns/ume.json';
import umeB from '../patterns/ume-b.json';
import sakuraAVariant from '../patterns/sakura-a-variant.json';
import sakuraBVariant from '../patterns/sakura-b-variant.json';
import kawariUrahanaKikkoOriginal from '../patterns/kawari-urahana-kikko-original.json';
import mitsuBishiVariant from '../patterns/mitsu-bishi-variant.json';
import mitsuBishiVariantA from '../patterns/mitsu-bishi-variant-a.json';
import mitsuBishiVariantB from '../patterns/mitsu-bishi-variant-b.json';
import sakuraShippoVariant from '../patterns/sakura-shippo-variant.json';
import umeAVariant from '../patterns/ume-a-variant.json';
import umeBVariant from '../patterns/ume-b-variant.json';
import blank from '../patterns/blank.json';
import { validatePattern } from '../geometry/schema/validate.js';
import { buildAsanoha } from '../geometry/factories/asanoha.js';
import { buildTsumiishiKikko } from '../geometry/factories/tsumiishiKikko.js';
import { buildGoma } from '../geometry/factories/goma.js';
import { buildMikado } from '../geometry/factories/mikado.js';
import { buildKurumaKikko, buildKurumaKikkoTriangle } from '../geometry/factories/kurumaKikko.js';
import { buildSakuraA, buildSakuraB, buildSakuraAVariant, buildSakuraBVariant } from '../geometry/factories/sakura.js';
import { buildMitsukude } from '../geometry/factories/mitsukude.js';
import { buildMatsuba } from '../geometry/factories/matsuba.js';
import { buildBishamonKikkoA, buildBishamonKikkoB } from '../geometry/factories/bishamonKikko.js';
import { buildMatsunoha } from '../geometry/factories/matsunoha.js';
import { buildRindo } from '../geometry/factories/rindo.js';
import { buildKawariYaeZakura, buildYaeZakuraKikko } from '../geometry/factories/kawariYaeZakura.js';
import { buildTsunoAsanoha, buildTsunoAsanohaPointed } from '../geometry/factories/tsunoAsanoha.js';
import { buildKikyoAsanoha } from '../geometry/factories/kikyoAsanoha.js';
import { buildKawariGoma, buildKawariGomaVariant } from '../geometry/factories/kawariGoma.js';
import { buildKawariUrahanaKikko, buildKawariUrahanaKikkoOriginal } from '../geometry/factories/kawariUrahanaKikko.js';
import { buildRindoAsanoha } from '../geometry/factories/rindoAsanoha.js';
import { buildSakuraKikkoA, buildSakuraKikkoB } from '../geometry/factories/sakuraKikko.js';
import { buildKazaGurumaA, buildKazaGurumaB } from '../geometry/factories/kazaGuruma.js';
import { buildRindoTsanugiA, buildRindoTsanugiB } from '../geometry/factories/rindoTsanugi.js';
import { buildRyusoKikkoA, buildRyusoKikkoB } from '../geometry/factories/ryusoKikko.js';
import { buildMikadoVariant } from '../geometry/factories/mikadoVariant.js';
import { buildKomachiKikkoA, buildKomachiKikkoB, buildRyusoAsanohaA, buildRyusoAsanohaB } from '../geometry/factories/lappedTriangles.js';
import { buildYaeAsanoha } from '../geometry/factories/yaeAsanoha.js';
import { buildFutaeAsanoha } from '../geometry/factories/futaeAsanoha.js';
import { buildKawariAsanoha } from '../geometry/factories/kawariAsanoha.js';
import { buildWarigikuKikko } from '../geometry/factories/warigikuKikko.js';
import { buildOumeKikko } from '../geometry/factories/oumeKikko.js';
import { buildSeiunKikko } from '../geometry/factories/seiunKikko.js';
import { buildMitsuBishi, buildMitsuBishiVariant, buildMitsuBishiVariantA, buildMitsuBishiVariantB } from '../geometry/factories/mitsuBishi.js';
import { buildUrahanaKikko } from '../geometry/factories/urahanaKikko.js';
import { buildYaeUrahanaKikko } from '../geometry/factories/yaeUrahanaKikko.js';
import { buildShippo } from '../geometry/factories/shippo.js';
import { buildBishamonKikkoInsetA, buildBishamonKikkoInsetB } from '../geometry/factories/bishamonKikkoInset.js';
import { buildSakuraShippo, buildSakuraShippoVariant } from '../geometry/factories/sakuraShippo.js';
import { buildSokutenKikko } from '../geometry/factories/sokutenKikko.js';
import { buildUme, buildUmeB, buildUmeAVariant, buildUmeBVariant } from '../geometry/factories/ume.js';
import { buildBlank } from '../geometry/factories/blank.js';
import useGridStore from './useGridStore.js';
import useSelectionStore from './useSelectionStore.js';
import useAppStore from './useAppStore.js';
import {
  MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM, DEFAULT_PATTERN_STRIP_WIDTH_MM,
  mmToIn, inToMm, STRIP_IN_STEP, roundUpToStripInStep, roundDownToMmStep,
} from '../geometry/units.js';
import { getMaterialColor } from '../geometry/woodFinishColors.js';
import { WOOD_OPTIONS, FINISH_OPTIONS, canonicalWood, allowedFinish } from '../geometry/materials.js';
import { builds, maxFeasibleStripWidth, feasibleParamRange } from '../geometry/feasibility.js';
import { readLengthMm, lengthParam, resolveParamState, paramsKey, isRatioDef, ratioOf, storedParamFor, migrateParams, ratioForMm } from '../geometry/params.js';

// NOTE: patterns/asanoha-one.json was previously imported here as a built-in.
// It's a 1-strip scratch/test file (not one of the four canonical patterns from
// the implementation plan) and fails validation — its joint j0 references strips
// s1/s2 that don't exist. Worse, it was BUILT_INS[0], so it was the pattern the
// app loaded by default, making the app look broken/empty on first launch. Removed.
//
// 'blank' is appended at the END deliberately — BUILT_INS[0] is what seeds the
// default activePatternId below, and an empty pattern being the default on
// first launch is exactly the bug that got fixed by removing asanoha-one.
const BUILT_INS = [asanoha, tsumiishiKikko, goma, mikado, kurumaKikko, kurumaKikkoTriangle, mitsukude, matsuba, bishamonKikkoA, bishamonKikkoB, matsunoha, rindo, sakuraA, sakuraAVariant, sakura, sakuraBVariant, kawariYaeZakura, yaeZakuraKikko, tsunoAsanoha, tsunoAsanohaPointed, yaeAsanoha, kikyoAsanoha, komachiKikkoA, komachiKikkoB, ryusoAsanohaA, ryusoAsanohaB, futaeAsanoha, kawariAsanoha, warigikuKikko, oumeKikko, seiunKikko, mitsuBishi, mitsuBishiVariant, mitsuBishiVariantA, mitsuBishiVariantB, urahanaKikko, yaeUrahanaKikko, shippo, ume, umeAVariant, umeB, umeBVariant, bishamonKikkoInsetA, bishamonKikkoInsetB, sakuraShippo, sakuraShippoVariant, sokutenKikko, kawariGoma, kawariGomaVariant, kawariUrahanaKikkoOriginal, kawariUrahanaKikko, rindoAsanoha, sakuraKikkoA, sakuraKikkoB, kazaGurumaA, kazaGurumaB, rindoTsanugiA, rindoTsanugiB, ryusoKikkoA, ryusoKikkoB, mikadoVariant, blank];

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
  'builtin:kuruma-kikko-sixth': buildKurumaKikko,
  'builtin:kuruma-kikko-triangle-sixth': buildKurumaKikkoTriangle,
  'builtin:mitsukude-sixth': buildMitsukude,
  'builtin:matsuba-sixth': buildMatsuba,
  'builtin:bishamon-kikko-a-sixth': buildBishamonKikkoA,
  'builtin:bishamon-kikko-b-sixth': buildBishamonKikkoB,
  'builtin:matsunoha-sixth': buildMatsunoha,
  'builtin:rindo-cross-sixth': buildRindo,
  'builtin:sakura-a-sixth': buildSakuraA,
  'builtin:sakura-a-variant-sixth': buildSakuraAVariant,
  'builtin:sakura-sixth': buildSakuraB,
  'builtin:sakura-variant-sixth': buildSakuraBVariant,
  'builtin:kawari-yae-zakura-sixth': buildKawariYaeZakura,
  'builtin:yae-zakura-kikko-sixth': buildYaeZakuraKikko,
  'builtin:tsuno-asanoha-sixth': buildTsunoAsanoha,
  'builtin:tsuno-asanoha-pointed-sixth': buildTsunoAsanohaPointed,
  'builtin:kikyo-asanoha-sixth': buildKikyoAsanoha,
  'builtin:kawari-goma-sixth': buildKawariGoma,
  'builtin:kawari-goma-variant-sixth': buildKawariGomaVariant,
  'builtin:kawari-urahana-kikko-sixth': buildKawariUrahanaKikko,
  'builtin:kawari-urahana-kikko-original-sixth': buildKawariUrahanaKikkoOriginal,
  'builtin:rindo-asanoha-sixth': buildRindoAsanoha,
  'builtin:sakura-kikko-a-sixth': buildSakuraKikkoA,
  'builtin:sakura-kikko-b-sixth': buildSakuraKikkoB,
  'builtin:kaza-guruma-a-sixth': buildKazaGurumaA,
  'builtin:kaza-guruma-b-sixth': buildKazaGurumaB,
  'builtin:rindo-tsanugi-a-sixth': buildRindoTsanugiA,
  'builtin:rindo-tsanugi-b-sixth': buildRindoTsanugiB,
  'builtin:ryuso-kikko-a-sixth': buildRyusoKikkoA,
  'builtin:ryuso-kikko-b-sixth': buildRyusoKikkoB,
  'builtin:mikado-variant-a-sixth': buildMikadoVariant,
  'builtin:komachi-kikko-a-sixth': buildKomachiKikkoA,
  'builtin:komachi-kikko-b-sixth': buildKomachiKikkoB,
  'builtin:ryuso-asanoha-a-sixth': buildRyusoAsanohaA,
  'builtin:ryuso-asanoha-b-sixth': buildRyusoAsanohaB,
  'builtin:yae-asanoha-sixth': buildYaeAsanoha,
  'builtin:futae-asanoha-sixth': buildFutaeAsanoha,
  'builtin:kawari-asanoha-sixth': buildKawariAsanoha,
  'builtin:warigiku-kikko-sixth': buildWarigikuKikko,
  'builtin:oume-kikko-sixth': buildOumeKikko,
  'builtin:seiun-kikko-sixth': buildSeiunKikko,
  'builtin:mitsu-bishi-sixth': buildMitsuBishi,
  'builtin:mitsu-bishi-variant-b-sixth': buildMitsuBishiVariantB,
  'builtin:mitsu-bishi-variant-a-sixth': buildMitsuBishiVariantA,
  'builtin:mitsu-bishi-variant-sixth': buildMitsuBishiVariant,
  'builtin:urahana-kikko-sixth': buildUrahanaKikko,
  'builtin:yae-urahana-kikko-sixth': buildYaeUrahanaKikko,
  'builtin:shippo-sixth': buildShippo,
  'builtin:bishamon-kikko-inset-a-sixth': buildBishamonKikkoInsetA,
  'builtin:bishamon-kikko-inset-b-sixth': buildBishamonKikkoInsetB,
  'builtin:sakura-shippo-sixth': buildSakuraShippo,
  'builtin:sakura-shippo-variant-sixth': buildSakuraShippoVariant,
  'builtin:sokuten-kikko-sixth': buildSokutenKikko,
  'builtin:ume-sixth': buildUme,
  'builtin:ume-variant-sixth': buildUmeAVariant,
  'builtin:ume-b-sixth': buildUmeB,
  'builtin:ume-b-variant-sixth': buildUmeBVariant,
  'builtin:blank': buildBlank,
};

// The parameter definitions a pattern's factory declares (see
// geometry/params.js) — [] for patterns with none. Takes the BASE pattern id,
// since a saved user pattern reuses its source built-in's factory.
function paramDefsFor(basePatternId) {
  return FACTORY_BY_ID[basePatternId]?.paramDefs ?? [];
}

// Brings one saved custom pattern (from localStorage, or a recipe read from a project
// file) up to the current shape. Idempotent, so it is safe to run on every load.
export function migrateStoredPattern(p) {
  // Goma's `spacing` parameter was renamed `inset`. Saved user patterns
  // written before the rename carry the old key (and possibly a bare number
  // rather than { length, unit }); carry the value over so they keep their
  // geometry instead of silently falling back to the default.
  // Rindo was renamed Matsuba: saved patterns built on it keep working.
  if (p?.basePatternId === 'builtin:rindo-sixth') p = { ...p, basePatternId: 'builtin:matsuba-sixth' };
  if (p?.patternParams && 'spacing' in p.patternParams) {
    const { spacing, ...rest } = p.patternParams;
    p = { ...p, patternParams: { ...rest, inset: rest.inset ?? spacing } };
  }
  // Inset, stub length, secondary spacing and curve length are ratios now: saved patterns
  // written with millimetres have them converted, as if authored at the reference
  // dimensions (50 mm cell), so they keep their look at that size and follow the cell from there.
  if (p?.patternParams) {
    const migrated = migrateParams(paramDefsFor(p.basePatternId ?? p.id), p.patternParams, p.stripProperties?.[0]?.width);
    if (migrated !== p.patternParams) p = { ...p, patternParams: migrated };
  }
  return p;
}

function loadUserPatterns() {
  try {
    const saved = JSON.parse(localStorage.getItem('kumiko_user_patterns') || '[]');
    return saved.map(migrateStoredPattern);
  } catch { return []; }
}

// Used by the project file (store/projectFormat.js).
export const isKnownBasePattern = (id) => typeof id === 'string' && id in FACTORY_BY_ID;
// True when the pattern's factory says the regular strip width doesn't apply to it.
function stripWidthHidden(basePatternId) {
  return !!FACTORY_BY_ID[basePatternId]?.hideStripWidth;
}
export { recipeKey, storedParams, paramDefsFor, stripWidthHidden };

// (Reusing a stripProperties entry is keyed on WIDTH as well as wood/finish —
// see applyStripColorOverrides — because a pattern like Sakura has strips of
// different widths, each with its own entry.)
//
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
  // Keyed on the BASE entry too (it carries the strip's width), so overriding
  // a thick and a thin strip to the same wood doesn't collapse them into one
  // entry with a single width.
  const spByKey = new Map();
  let n = nextStripProperties.length;

  const nextPieceTemplates = pattern.pieceTemplates.map((pt) => {
    const override = stripOverrides[pt.stripId];
    if (!override) return pt;
    const material = override.material ?? defaultMaterial;
    const finish = override.finish ?? defaultFinish;
    const key = `${pt.stripPropertyId}:${material}:${finish}`;
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
  // Every parameter the base pattern declares, normalised to mm with its
  // default filled in — so "unset" and "explicitly set to the default"
  // compare equal, as do { 6, 'mm' } and a bare 6.
  const defs = paramDefsFor(recipe.basePatternId);
  const paramEntries = defs
    .map((def) => {
      const v = storedParamFor(def, recipe.params?.[def.key], defs);
      return `${def.key}=${ratioOf(v) != null ? `r${Number(ratioOf(v).toFixed(6))}` : v.length}`;
    })
    .join(',');
  return [recipe.basePatternId, recipe.patternStripWidth, recipe.material, recipe.finish, paramEntries, stripEntries].join('|');
}

// Drops per-strip overrides that just restate the recipe's own wood and finish
// (they colour the strip exactly as the default would), so a pattern whose
// strips were all painted one wood compares equal to a plain pattern in it.
function normalizeStripMaterials(stripMaterials, material, finish) {
  const out = {};
  for (const [stripId, v] of Object.entries(stripMaterials || {})) {
    if (!v) continue;
    if ((v.material ?? material) === material && (v.finish ?? finish) === finish) continue;
    out[stripId] = v;
  }
  return out;
}

// "Walnut" from "Walnut" / "Hinoki" from "Hinoki (Japanese cypress)", and
// "Natural" from "Natural / unfinished" — short enough to put in a name.
const shortLabel = (options, id) => (options.find((o) => o.id === id)?.label ?? id).split(/\s+[(/]/)[0];

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

// Builds a pattern, and if the factory can't build it (an out-of-range width or
// parameter left over from before the limits tightened, a saved pattern from an older
// version, ...) falls back rather than throwing, since an error while drawing blanks the
// whole app: first the same pattern at the widest strip width it does build, then at
// its default parameters, and as a last resort the blank pattern.
function buildOrFallback(build, args, template) {
  // (a half cell's pattern is built small with the full cell's parameters, see paramCellWidth in
  // factories/_shared.js; if those don't fit the smaller cell it is built with its own)
  if (args.paramCellWidth != null) {
    try { return build(args); } catch { args = { ...args, paramCellWidth: undefined }; }
  }
  try { return build(args); } catch (error) {
    console.warn(`[pattern] ${template.name} can't be built with these settings, using the nearest that works:`, error.message);
  }
  const { cellWidth, gridStripWidth } = args;
  const widest = maxFeasibleStripWidth(build, { ...args }, MIN_STRIP_WIDTH_MM, args.patternStripWidth);
  for (const attempt of [{ ...args, patternStripWidth: widest }, { ...args, patternStripWidth: widest, patternParams: {} },
    { ...args, patternStripWidth: MIN_STRIP_WIDTH_MM, patternParams: {} }]) {
    if (builds(build, attempt)) return build(attempt);
  }
  return buildBlank({ cellWidth, gridStripWidth });
}

// ── Built-pattern memo ──────────────────────────────────────────────────────
// Building a pattern isn't free — a curved one (Ume, Sakura-shippo) solves a
// whole family of bent-strip shapes, ~5 ms when its dimensions have been seen
// before and ~0.5 s the first time at a new cell/strip width — and it is asked
// for constantly: the panel once per CELL on every render (pan included), each
// library icon, the Viewport, the Inspector. The result is a pure function of
// the inputs in the key below, so it is remembered per template (the template
// object itself keys a WeakMap, so a deleted/replaced user pattern takes its
// entries with it). Callers only read the returned pattern, never mutate it.
const builtCache = new WeakMap(); // template -> Map(inputs key -> built pattern)
const BUILT_CACHE_MAX_PER_TEMPLATE = 64;
function memoBuilt(template, key, make) {
  let byKey = builtCache.get(template);
  if (!byKey) { byKey = new Map(); builtCache.set(template, byKey); }
  let built = byKey.get(key);
  if (!built) {
    if (byKey.size >= BUILT_CACHE_MAX_PER_TEMPLATE) byKey.clear();
    built = make();
    byKey.set(key, built);
  }
  return built;
}

// The rounding grid, in mm, that ratio-based parameters are snapped to when a pattern is built:
// the def's own step in metric (undefined here), 1/16" in imperial.
const paramStepFor = (unit) => (unit === 'in' ? inToMm(STRIP_IN_STEP) : undefined);

const RECENT_PATTERNS_MAX = 15;

// template -> Map(settings key -> feasible limit); see getStripWidthMax / getParamLimits.
const feasibleWidthCache = new WeakMap();

// Built-in patterns whose defaults the user has overridden (Set as Default):
// { [patternId]: { patternStripWidth, material, finish, params, stripMaterials } }.
const DEFAULTS_KEY = 'kumiko_builtin_defaults';
function loadBuiltInDefaults() {
  try {
    const v = JSON.parse(localStorage.getItem(DEFAULTS_KEY));
    if (!v || typeof v !== 'object') return {};
    // Saved defaults carry the same millimetre -> ratio conversion as saved patterns.
    return Object.fromEntries(Object.entries(v).map(([id, recipe]) => [
      id, recipe?.params ? { ...recipe, params: migrateParams(paramDefsFor(id), recipe.params, recipe.patternStripWidth) } : recipe,
    ]));
  } catch { return {}; }
}

// Every parameter the pattern declares in its stored shape ({ ratio } or { length, unit }),
// defaults filled in.
function storedParams(basePatternId, params) {
  const defs = paramDefsFor(basePatternId);
  return Object.fromEntries(defs.map((def) => [def.key, storedParamFor(def, params?.[def.key], defs)]));
}

// A copy of a built-in template with a recipe baked in as its own defaults.
function templateWithDefaults(template, recipe) {
  return {
    ...template,
    patternParams: storedParams(template.id, recipe.params),
    stripProperties: template.stripProperties.map((sp, i) => (i === 0
      ? { ...sp, width: recipe.patternStripWidth, material: recipe.material, finish: recipe.finish, color: getMaterialColor(recipe.material, recipe.finish) }
      : sp)),
    stripMaterialOverrides: recipe.stripMaterials,
  };
}

const ORIGINAL_BUILT_INS = BUILT_INS;
const initialDefaults = loadBuiltInDefaults();
const INITIAL_BUILT_INS = BUILT_INS.map((p) => (initialDefaults[p.id] ? templateWithDefaults(p, initialDefaults[p.id]) : p));

const usePatternStore = create((set, get) => ({
  builtInPatterns: INITIAL_BUILT_INS,
  // Which built-ins carry user-set defaults (see setAsDefault).
  builtInDefaults: initialDefaults,
  userPatterns: loadUserPatterns(),
  activePatternId: BUILT_INS[0].id,
  // Most-recent-first, capped at RECENT_PATTERNS_MAX. Seeded with the initial pattern so the
  // "Recently used" list isn't empty on first load.
  recentPatternIds: [BUILT_INS[0].id],
  // Live per-pattern edits layered on top of each template's defaults —
  // { [patternId]: { patternStripWidth?: number, params?: { [key]: {length,unit} }, ... } }.
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
  //
  // In the pattern editor, switching to a DIFFERENT pattern also throws away
  // the pattern being left's pending (unsaved) edits — its live width, params,
  // wood/finish and per-strip colour overrides (patternOverrides) — so it comes
  // back as its saved/default self next time. Silent by design: that's just how
  // the editor works. Re-selecting the pattern already active changes nothing,
  // and the panel editor is exempt (there, an edited pattern's overrides are
  // what every placed copy is drawn with).
  setActivePattern: (id) => {
    useSelectionStore.getState().clearSelection();
    const discardEdits = useAppStore.getState().workspace === 'pattern-editor';
    set((state) => {
      const leaving = state.activePatternId;
      let patternOverrides = state.patternOverrides;
      if (discardEdits && leaving !== id && patternOverrides[leaving]) {
        const { [leaving]: _discarded, ...rest } = patternOverrides;
        patternOverrides = rest;
      }
      return {
        activePatternId: id,
        patternOverrides,
        recentPatternIds: [id, ...state.recentPatternIds.filter((pid) => pid !== id)].slice(0, RECENT_PATTERNS_MAX),
      };
    });
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
  //
  // `ctx` is optional and lets a caller ask "what WOULD this look like at
  // these dimensions / overrides" without changing any state:
  // { cellWidth, gridStripWidth, patternOverrides }, each defaulting to the
  // live value. The debounced grid-dimension commit uses it to build and
  // rasterize the panel's patterns for the NEW dimensions before they're
  // applied (see store/gridDimensionsCommit.js). Results are memoized (see
  // memoBuilt), so asking again with the same inputs is a lookup.
  getComputedPattern: (id, ctx) => {
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
    const grid = useGridStore.getState();
    const cellWidth = ctx?.cellWidth ?? grid.cellWidth;
    const gridStripWidth = ctx?.gridStripWidth ?? grid.gridStripWidth;
    const paramCellWidth = ctx?.paramCellWidth;
    const paramStep = paramStepFor(useAppStore.getState().gridUnit);
    const overrides = (ctx?.patternOverrides ?? state.patternOverrides)[id] || {};
    const patternStripWidth = overrides.patternStripWidth ?? template.stripProperties?.[0]?.width ?? DEFAULT_PATTERN_STRIP_WIDTH_MM;
    const material = canonicalWood(overrides.material ?? template.stripProperties?.[0]?.material ?? 'basswood');
    const finish = allowedFinish(material, overrides.finish ?? template.stripProperties?.[0]?.finish ?? 'natural');
    const patternParams = { ...template.patternParams, ...overrides.params };
    const stripMaterials = mergeStripMaterials(template.stripMaterialOverrides, overrides.stripMaterials);
    // Patterns with strips in the grid's own wood and finish are built again when those change.
    const gridMaterial = build.usesGridMaterial ? (ctx?.gridMaterial ?? grid.material) : undefined;
    const gridFinish = build.usesGridMaterial ? (ctx?.gridFinish ?? grid.finish) : undefined;
    const key = ['c', cellWidth, paramCellWidth ?? '', gridStripWidth, patternStripWidth, material, finish, paramsKey(patternParams), JSON.stringify(stripMaterials), paramStep ?? '', gridMaterial ?? '', gridFinish ?? ''].join('|');
    return memoBuilt(template, key, () => {
      const computed = withTemplateIdentity(buildOrFallback(build, { cellWidth, paramCellWidth, gridStripWidth, patternStripWidth, patternParams, material, finish, paramStep, gridMaterial, gridFinish }, template), template);
      if (Object.keys(stripMaterials).length) {
        return applyStripColorOverrides(computed, stripMaterials, material, finish);
      }
      return computed;
    });
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
  // `ctx` ({ cellWidth, gridStripWidth }, each defaulting to the live value)
  // lets a caller pass the dimensions it wants explicitly — PatternIcon passes
  // deferred copies so the sidebar thumbnails can trail the panel.
  getCanonicalPattern: (id, ctx) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    if (!template) return state.builtInPatterns[0];
    const build = FACTORY_BY_ID[template.basePatternId ?? id];
    if (!build) return template;
    const grid = useGridStore.getState();
    const cellWidth = ctx?.cellWidth ?? grid.cellWidth;
    const gridStripWidth = ctx?.gridStripWidth ?? grid.gridStripWidth;
    const paramStep = paramStepFor(useAppStore.getState().gridUnit);
    const gridMaterial = build.usesGridMaterial ? grid.material : undefined;
    const gridFinish = build.usesGridMaterial ? grid.finish : undefined;
    return memoBuilt(template, `k|${cellWidth}|${gridStripWidth}|${paramStep ?? ''}|${gridMaterial ?? ''}|${gridFinish ?? ''}`, () => {
      const patternStripWidth = template.stripProperties?.[0]?.width ?? DEFAULT_PATTERN_STRIP_WIDTH_MM;
      const material = canonicalWood(template.stripProperties?.[0]?.material ?? 'basswood');
      const finish = allowedFinish(material, template.stripProperties?.[0]?.finish ?? 'natural');
      const computed = withTemplateIdentity(build({ cellWidth, gridStripWidth, patternStripWidth, patternParams: template.patternParams, material, finish, paramStep, gridMaterial, gridFinish }), template);
      const stripMaterials = template.stripMaterialOverrides;
      if (stripMaterials && Object.keys(stripMaterials).length) {
        return applyStripColorOverrides(computed, stripMaterials, material, finish);
      }
      return computed;
    });
  },
  // `patternOverrides` defaults to the live ones; the grid-dimension commit
  // passes the clamped set it's about to apply.
  getEffectiveStripWidth: (id, patternOverrides) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return (patternOverrides ?? state.patternOverrides)[id]?.patternStripWidth ?? template?.stripProperties?.[0]?.width ?? DEFAULT_PATTERN_STRIP_WIDTH_MM;
  },
  getEffectiveMaterial: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return canonicalWood(state.patternOverrides[id]?.material ?? template?.stripProperties?.[0]?.material ?? 'basswood');
  },
  getEffectiveFinish: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return allowedFinish(get().getEffectiveMaterial(id), state.patternOverrides[id]?.finish ?? template?.stripProperties?.[0]?.finish ?? 'natural');
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
  // The widest regular strip this pattern allows: a third of the cell, or less for patterns
  // that declare their own cap (the curved patterns, whose thin strips have to bend).
  // `cellWidth` defaults to the live one (the grid-dimension commit asks about
  // the width it's about to apply).
  //
  // That is only the nominal limit. A pattern whose strips depend on each other can
  // stop being buildable well before it (Yae-/Futae-asanoha's arrowhead stops
  // fitting), so the result is tightened to the widest width the pattern actually
  // builds at, with its current parameters (geometry/feasibility.js). Remembered per
  // pattern, dimensions and parameters, so asking again is a lookup.
  getStripWidthMax: (id, cellWidth = useGridStore.getState().cellWidth, gridStripWidth = useGridStore.getState().gridStripWidth) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    const factory = FACTORY_BY_ID[template?.basePatternId ?? id];
    const cap = factory?.maxStripWidth;
    const nominal = cellWidth * MAX_STRIP_WIDTH_FRACTION;
    const max = cap != null ? Math.min(nominal, cap) : nominal;
    if (!factory || !template) return max;
    const patternParams = { ...template.patternParams, ...state.patternOverrides[id]?.params };
    const key = `${cellWidth}|${gridStripWidth}|${max}|${paramsKey(patternParams)}`;
    let byKey = feasibleWidthCache.get(template);
    if (!byKey) { byKey = new Map(); feasibleWidthCache.set(template, byKey); }
    if (!byKey.has(key)) {
      if (byKey.size > 64) byKey.clear();
      byKey.set(key, maxFeasibleStripWidth(factory, { cellWidth, gridStripWidth, patternParams }, MIN_STRIP_WIDTH_MM, max));
    }
    return byKey.get(key);
  },
  // Every parameter's valid range for this pattern at the given strip width and
  // dimensions: the declared range, tightened to what the whole pattern builds at
  // (see getStripWidthMax). { [key]: { min, max } }. Remembered like the above.
  getParamLimits: (id, patternStripWidth, cellWidth = useGridStore.getState().cellWidth, gridStripWidth = useGridStore.getState().gridStripWidth) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    const factory = FACTORY_BY_ID[template?.basePatternId ?? id];
    const defs = factory?.paramDefs ?? [];
    if (!factory || !template || !defs.length) return {};
    const stored = { ...template.patternParams, ...state.patternOverrides[id]?.params };
    const { values, bounds } = resolveParamState(defs, stored, { cellWidth, gridStripWidth, patternStripWidth });
    const key = `L|${cellWidth}|${gridStripWidth}|${patternStripWidth}|${paramsKey(stored)}`;
    let byKey = feasibleWidthCache.get(template);
    if (!byKey) { byKey = new Map(); feasibleWidthCache.set(template, byKey); }
    if (!byKey.has(key)) {
      if (byKey.size > 64) byKey.clear();
      const args = { cellWidth, gridStripWidth, patternStripWidth, patternParams: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { length: v, unit: 'mm' }])) };
      const out = {};
      for (const def of defs) out[def.key] = feasibleParamRange(factory, args, def.key, bounds[def.key], values[def.key]);
      byKey.set(key, out);
    }
    return byKey.get(key);
  },
  // Called when the length unit changes: puts this pattern's strip width and
  // parameters on the new unit's step grid. Strip width follows the rule it always
  // had (up to the next 1/16" going to inches, down to a whole mm going to mm);
  // parameters go to the nearest step (1/16", or the def's own mm step). Everything
  // is still clamped by the usual setters.
  snapPatternForUnit: (id, unit) => {
    const state = get();
    if (![...state.builtInPatterns, ...state.userPatterns].some((p) => p.id === id)) return;
    const w = state.getEffectiveStripWidth(id);
    const snappedW = unit === 'in' ? inToMm(roundUpToStripInStep(w)) : roundDownToMmStep(w);
    if (Math.abs(snappedW - w) > 1e-9) state.setPatternStripWidth(id, Math.max(snappedW, MIN_STRIP_WIDTH_MM));
    const defs = state.getParamDefs(id);
    if (!defs.length) return;
    for (const def of defs) {
      // Ratio parameters are put on the new unit's grid when the pattern is built (paramStep),
      // so their stored ratio is left exactly as it is — no drift from flipping back and forth.
      if (isRatioDef(def)) continue;
      // The effective value (what is shown), not just what was stored.
      const cur = readLengthMm(get().getComputedPattern(id).patternParams?.[def.key], def.default);
      const next = unit === 'in'
        ? inToMm(Math.round(mmToIn(cur) / STRIP_IN_STEP) * STRIP_IN_STEP)
        : Math.round(cur / (def.step ?? 0.5)) * (def.step ?? 0.5);
      if (Math.abs(next - cur) > 1e-9) get().setPatternParam(id, def.key, next);
    }
  },
  setPatternStripWidth: (id, width) => {
    if (!(width > 0)) return;
    const max = get().getStripWidthMax(id);
    const clamped = Math.max(Math.min(width, max), MIN_STRIP_WIDTH_MM);
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], patternStripWidth: clamped } },
    }));
  },
  setPatternMaterial: (id, material) => {
    // A wood that's only offered in some finishes (Purpleheart) brings the finish along to one it has.
    const finish = allowedFinish(material, get().getEffectiveFinish(id));
    set((state) => ({
      patternOverrides: { ...state.patternOverrides, [id]: { ...state.patternOverrides[id], material, finish } },
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
  // Strips glued into one laminated piece are finished as one: a finish set on any layer
  // goes to every strip of its lamination group (the wood can still differ per layer).
  setStripsFinish: (id, stripIds, finish) => {
    const groups = (get().getComputedPattern(id)?.laminations ?? []).map((g) => g.flat());
    const all = new Set(stripIds);
    for (const g of groups) if (g.some((sid) => all.has(sid))) g.forEach((sid) => all.add(sid));
    stripIds = [...all];
    set((state) => {
      const patternOv = state.patternOverrides[id] || {};
      const stripMaterials = { ...patternOv.stripMaterials };
      stripIds.forEach((stripId) => {
        stripMaterials[stripId] = { ...stripMaterials[stripId], finish };
      });
      return { patternOverrides: { ...state.patternOverrides, [id]: { ...patternOv, stripMaterials } } };
    });
  },
  // The parameters the active pattern's factory declares (key, label, bounds
  // — see geometry/params.js), for the Inspector to build its controls from.
  getParamDefs: (id) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    return template ? paramDefsFor(template.basePatternId ?? id) : [];
  },
  // Sets one pattern parameter (a length in mm), clamped to the range its def
  // allows at the CURRENT cell/strip dimensions — same style as
  // setPatternStripWidth. Non-numbers are ignored; unlike strip width a
  // parameter may legitimately be 0 (e.g. Goma's inset flush against the
  // grid strip), so 0 is accepted when the def's min allows it.
  setPatternParam: (id, key, lengthMm) => {
    if (!Number.isFinite(lengthMm)) return;
    const state = get();
    const def = state.getParamDefs(id).find(d => d.key === key);
    if (!def) return;
    const { cellWidth, gridStripWidth } = useGridStore.getState();
    // Bounds can depend on the other params' CURRENT values (Sakura's corner
    // spacing on its thick strip width), so resolve the whole set the way the
    // factory will, then clamp against this key's range.
    const template = [...state.builtInPatterns, ...state.userPatterns].find(p => p.id === id);
    const stored = { ...template?.patternParams, ...state.patternOverrides[id]?.params };
    const patternStripWidth = state.getEffectiveStripWidth(id);
    const declared = resolveParamState(state.getParamDefs(id), stored, { cellWidth, gridStripWidth, patternStripWidth }).bounds[key];
    // Tightened to what the whole pattern builds at — not just this param's own range.
    const { min, max } = state.getParamLimits(id, patternStripWidth)[key] ?? declared;
    const clamped = Math.min(Math.max(lengthMm, min), max);
    // A ratio parameter keeps what was typed as a ratio under the CURRENT dimensions (of the
    // cell, or of the parameter's declared range), so it follows the cell from here on.
    const value = isRatioDef(def) ? { ratio: ratioForMm(def, clamped, { cellWidth }, declared) } : lengthParam(clamped);
    set((s) => {
      const ov = s.patternOverrides[id] || {};
      return {
        patternOverrides: { ...s.patternOverrides, [id]: { ...ov, params: { ...ov.params, [key]: value } } },
      };
    });
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
    const plan = get().planStripWidthClamp(useGridStore.getState().cellWidth);
    if (plan.changed) set({ patternOverrides: plan.patternOverrides });
  },
  // What clampAllStripWidths WOULD do if the cell width were `cellWidth`,
  // without doing it: { patternOverrides, changed }. patternOverrides is the
  // current object itself when nothing needs clamping, so callers can compare
  // by reference. The debounced grid-dimension commit plans against the new
  // width first (to build the panel's patterns with the clamped strip widths
  // already in place), then applies the same plan together with the new width.
  planStripWidthClamp: (cellWidth, gridStripWidth = useGridStore.getState().gridStripWidth) => {
    const state = get();
    const { spacePatterns } = useGridStore.getState();
    const idsToCheck = [state.activePatternId, ...new Set(Object.values(spacePatterns))];
    const allPatterns = [...state.builtInPatterns, ...state.userPatterns];
    let changed = false;
    const nextOverrides = { ...state.patternOverrides };
    for (const id of idsToCheck) {
      const template = allPatterns.find(p => p.id === id);
      const current = nextOverrides[id]?.patternStripWidth ?? template?.stripProperties?.[0]?.width;
      const max = state.getStripWidthMax(id, cellWidth, gridStripWidth);
      if (current != null && current > max) {
        nextOverrides[id] = { ...nextOverrides[id], patternStripWidth: max };
        changed = true;
      }
    }
    return { patternOverrides: changed ? nextOverrides : state.patternOverrides, changed };
  },
  // A pattern's own CANONICAL recipe — its saved/baked-in defaults, ignoring
  // this session's live patternOverrides entirely. Used as the "nothing's
  // changed yet" baseline (hasUnsavedChanges) and as what a duplicate-check
  // compares an about-to-be-saved recipe against for every OTHER pattern.
  getTemplateRecipe: (template) => ({
    basePatternId: template.basePatternId ?? template.id,
    patternStripWidth: template.stripProperties?.[0]?.width ?? DEFAULT_PATTERN_STRIP_WIDTH_MM,
    material: canonicalWood(template.stripProperties?.[0]?.material ?? 'basswood'),
    finish: allowedFinish(canonicalWood(template.stripProperties?.[0]?.material ?? 'basswood'), template.stripProperties?.[0]?.finish ?? 'natural'),
    params: template.patternParams ?? {},
    stripMaterials: normalizeStripMaterials(
      template.stripMaterialOverrides,
      canonicalWood(template.stripProperties?.[0]?.material ?? 'basswood'),
      template.stripProperties?.[0]?.finish ?? 'natural',
    ),
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
    const material = ov.material ?? base.material;
    const finish = ov.finish ?? base.finish;
    return {
      basePatternId: base.basePatternId,
      patternStripWidth: ov.patternStripWidth ?? base.patternStripWidth,
      material,
      finish,
      params: { ...base.params, ...ov.params },
      stripMaterials: normalizeStripMaterials(
        mergeStripMaterials(template.stripMaterialOverrides, ov.stripMaterials), material, finish),
    };
  },
  // A string that is equal for two patterns exactly when their current recipes
  // are (the Validation tool's "matching parameters"). An unknown id is only
  // equal to itself.
  getMatchKey: (id) => {
    const recipe = get().getCurrentRecipe(id);
    return recipe ? recipeKey(recipe) : `unknown:${id}`;
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
  // width/material/finish/pattern parameters, plus any per-strip material/finish
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
    const newId = get().addRecipePattern(recipe, name);
    return { ok: true, id: newId, name };
  },
  // Adds a new library pattern for `recipe` under `name` (already unique) and
  // returns its id. Shared by saveUserPattern and the Fill / paint tool.
  addRecipePattern: (recipe, name) => {
    const newId = `user:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const newTemplate = {
      id: newId,
      name,
      readOnly: false,
      basePatternId: recipe.basePatternId,
      // Every parameter the base pattern declares, with defaults filled in.
      patternParams: storedParams(recipe.basePatternId, recipe.params),
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
    return newId;
  },
  // Save changes (custom patterns): writes the open pattern's current state back
  // into that same pattern, instead of adding a new one. The live edits are
  // folded into the saved pattern (so nothing is "unsaved" afterwards) and every
  // cell using it picks up the new state. Refuses if another pattern already has
  // exactly that recipe (the library never holds two identical patterns).
  saveChanges: (id) => {
    const state = get();
    const idx = state.userPatterns.findIndex((p) => p.id === id);
    if (idx < 0) return { ok: false, reason: 'not-a-custom-pattern' };
    const recipe = state.getCurrentRecipe(id);
    const key = recipeKey(recipe);
    const all = [...state.builtInPatterns, ...state.userPatterns];
    const duplicate = all.find((p) => p.id !== id && recipeKey(state.getTemplateRecipe(p)) === key);
    if (duplicate) return { ok: false, reason: 'duplicate', existingName: duplicate.name };
    const old = state.userPatterns[idx];
    const updated = {
      ...old,
      patternParams: storedParams(recipe.basePatternId, recipe.params),
      stripProperties: [{
        ...(old.stripProperties?.[0] ?? { id: 'sp0', thickness: 6.0, grain: 'along', edgeProfile: null }),
        width: recipe.patternStripWidth,
        material: recipe.material,
        finish: recipe.finish,
        color: getMaterialColor(recipe.material, recipe.finish),
      }],
      stripMaterialOverrides: recipe.stripMaterials,
    };
    set((s) => {
      const userPatterns = s.userPatterns.map((p) => (p.id === id ? updated : p));
      try { localStorage.setItem('kumiko_user_patterns', JSON.stringify(userPatterns)); } catch { /* session only */ }
      const { [id]: _folded, ...patternOverrides } = s.patternOverrides;
      return { userPatterns, patternOverrides };
    });
    return { ok: true, id, name: old.name };
  },
  // Quietly makes sure the library has a pattern for `recipe`: nothing happens
  // if any pattern (built-in or saved) already has exactly that recipe,
  // otherwise one is added, named after its built-in shape plus the wood and
  // finish ("Asanoha Walnut Oiled"). Returns the new id, or null.
  // `label` ({ material, finish }) is what the name says — the wood and finish
  // that were just painted, which for a few strips isn't the pattern-wide one.
  ensureRecipePattern: (recipe, label = recipe) => {
    const state = get();
    const key = recipeKey(recipe);
    const all = [...state.builtInPatterns, ...state.userPatterns];
    if (all.some((p) => recipeKey(state.getTemplateRecipe(p)) === key)) return null;
    const baseName = state.builtInPatterns.find((p) => p.id === recipe.basePatternId)?.name ?? 'Pattern';
    const name = state.generateUniqueName(
      `${baseName} ${shortLabel(WOOD_OPTIONS, label.material)} ${shortLabel(FINISH_OPTIONS, label.finish)}`);
    return state.addRecipePattern(recipe, name);
  },
  // Fill / paint, panel editor: the library gets a pattern in this pattern's
  // shape painted all one wood and finish.
  // Returns the id of the library pattern a cell holding `patternId` should hold once
  // painted this wood and finish: the pattern itself if it already is that, else any
  // existing pattern with exactly that recipe, else a new custom one (named by the
  // library's usual rules). null for the blank pattern.
  ensurePaintedPattern: (patternId, material, finish) => {
    const state = get();
    const recipe = state.getCurrentRecipe(patternId);
    if (!recipe || recipe.basePatternId === 'blank' || patternId === 'builtin:blank') return null;
    const painted = { ...recipe, material, finish, stripMaterials: {} };
    const key = recipeKey(painted);
    const all = [...state.builtInPatterns, ...state.userPatterns];
    const own = all.find((p) => p.id === patternId);
    if (own && recipeKey(state.getTemplateRecipe(own)) === key) return patternId;
    const same = all.find((p) => recipeKey(state.getTemplateRecipe(p)) === key);
    if (same) return same.id;
    return state.ensureRecipePattern(painted, { material, finish });
  },
  // Fill / paint, pattern editor: set these strips of the pattern to a wood and
  // finish. Only a live edit — saving it as a pattern is the Save Pattern button's job.
  paintStrips: (patternId, stripIds, material, finish) => {
    if (!stripIds.length) return;
    get().setStripsMaterial(patternId, stripIds, material);
    get().setStripsFinish(patternId, stripIds, finish);
  },
  // Fill / paint, pattern editor: the whole pattern in one wood and finish —
  // the pattern-wide setting AND every strip's own override, saved ones too.
  paintWholePattern: (patternId, material, finish) => {
    const state = get();
    const template = [...state.builtInPatterns, ...state.userPatterns].find((p) => p.id === patternId);
    if (!template) return;
    const stripIds = new Set(Object.keys(template.stripMaterialOverrides || {}));
    for (const pt of state.getComputedPattern(patternId).pieceTemplates ?? []) if (pt.stripId) stripIds.add(pt.stripId);
    const stripMaterials = {};
    for (const id of stripIds) stripMaterials[id] = { material, finish };
    set((s) => ({
      patternOverrides: { ...s.patternOverrides, [patternId]: { ...s.patternOverrides[patternId], material, finish, stripMaterials } },
    }));
  },
  forkPattern: (id) => { /* TODO */ },
  // Set as Default (built-in patterns): what the pattern is set to right now —
  // width, wood, finish, parameters, per-strip colours — becomes the pattern's
  // own default, so it opens that way and the panel/library show it that way.
  // The live edits are folded into the default, leaving nothing "unsaved".
  setAsDefault: (id) => {
    const state = get();
    const template = state.builtInPatterns.find((p) => p.id === id);
    if (!template || !template.readOnly || id === 'builtin:blank') return { ok: false };
    const recipe = state.getCurrentRecipe(id);
    // Cells already holding this pattern were placed with the default it has NOW, and would
    // all change with the new one. To keep what the user placed, the old default is kept as a
    // custom pattern and those cells are pointed at it. This is the one place a custom pattern
    // may repeat a recipe the library already has (the built-in's own): an existing custom
    // copy of that same old default is reused instead of making another.
    let copyId = null, copyName = null, cellsMoved = 0;
    const oldRecipe = state.getTemplateRecipe(template);
    if (recipeKey(oldRecipe) !== recipeKey(recipe) && useGridStore.getState().countSpacesWithPattern(id) > 0) {
      const oldKey = recipeKey(oldRecipe);
      const existing = state.userPatterns.find((p) => recipeKey(state.getTemplateRecipe(p)) === oldKey);
      if (existing) { copyId = existing.id; copyName = existing.name; }
      else {
        copyName = state.generateUniqueName(`${template.name} ${state.builtInDefaults[id] ? 'Previous' : 'Original'}`);
        copyId = state.addRecipePattern(oldRecipe, copyName);
      }
      cellsMoved = useGridStore.getState().replacePatternInSpaces(id, copyId);
    }
    const builtInDefaults = { ...get().builtInDefaults, [id]: recipe };
    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(builtInDefaults)); } catch { /* session only */ }
    const original = ORIGINAL_BUILT_INS.find((p) => p.id === id);
    set((s) => {
      const { [id]: _folded, ...patternOverrides } = s.patternOverrides;
      return {
        builtInDefaults,
        patternOverrides,
        builtInPatterns: s.builtInPatterns.map((p) => (p.id === id ? templateWithDefaults(original, recipe) : p)),
      };
    });
    return { ok: true, copyId, copyName, cellsMoved };
  },
  // Revert to Default: back to the pattern's original built-in settings (also
  // dropping any unsaved edits to it). If the panel is using the pattern as it
  // is now, those cells would change appearance, so first the pattern as the panel
  // shows it (default plus live edits) is kept as a custom pattern, added to the
  // library, and the cells are pointed at that copy. An existing custom pattern
  // with the same recipe is reused rather than duplicated. Returns { ok,
  // copyId?, copyName?, cellsMoved }.
  revertToDefault: (id) => {
    const state = get();
    if (!state.builtInDefaults[id]) return { ok: false };
    const template = state.builtInPatterns.find((p) => p.id === id);
    let copyId = null, copyName = null, cellsMoved = 0;
    if (useGridStore.getState().countSpacesWithPattern(id) > 0) {
      const recipe = state.getCurrentRecipe(id);
      const key = recipeKey(recipe);
      const existing = state.userPatterns.find((p) => recipeKey(state.getTemplateRecipe(p)) === key);
      if (existing) { copyId = existing.id; copyName = existing.name; }
      else {
        copyName = state.generateUniqueName(`${template.name} Custom`);
        copyId = state.addRecipePattern(recipe, copyName);
      }
      cellsMoved = useGridStore.getState().replacePatternInSpaces(id, copyId);
    }
    const { [id]: _gone, ...builtInDefaults } = get().builtInDefaults;
    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(builtInDefaults)); } catch { /* session only */ }
    const original = ORIGINAL_BUILT_INS.find((p) => p.id === id);
    set((s) => {
      const { [id]: _folded, ...patternOverrides } = s.patternOverrides;
      return {
        builtInDefaults,
        patternOverrides,
        builtInPatterns: s.builtInPatterns.map((p) => (p.id === id ? original : p)),
      };
    });
    return { ok: true, copyId, copyName, cellsMoved };
  },
  // Moves a custom pattern to the position of another (drag and drop in the
  // library), and remembers the order.
  reorderUserPatterns: (movedId, targetId) => {
    if (movedId === targetId) return;
    set((s) => {
      const list = [...s.userPatterns];
      const from = list.findIndex((p) => p.id === movedId);
      const to = list.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return {};
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      try { localStorage.setItem('kumiko_user_patterns', JSON.stringify(list)); } catch { /* session only */ }
      return { userPatterns: list };
    });
  },
  // Another pattern (built-in or custom) whose saved recipe is identical to this
  // one's — same in everything but name and id — or null. Normally the library
  // can't hold two of these; the exception is the copy of a built-in's old
  // default that Set as Default leaves behind, which becomes identical to the
  // built-in again once it is reverted. Built-ins are preferred.
  findIdenticalPattern: (id) => {
    const state = get();
    const all = [...state.builtInPatterns, ...state.userPatterns];
    const self = all.find((p) => p.id === id);
    if (!self) return null;
    const key = recipeKey(state.getTemplateRecipe(self));
    return all.find((p) => p.id !== id && recipeKey(state.getTemplateRecipe(p)) === key) ?? null;
  },
  // Removes a custom (saved) pattern. Built-ins can't be deleted. Everything
  // that points at the pattern is cleaned up with it: it leaves the saved list
  // (and localStorage), the Recently Used list and the live overrides; and if it
  // was the active pattern the editor moves to the next most recent one (or the
  // first built-in). Panel cells holding it switch to an identical pattern when
  // there is one (keeping their rotation, mirroring and paint), and otherwise go
  // back to blank (rather than silently turning into some other pattern —
  // getComputedPattern falls back to the first built-in for an unknown id).
  deleteUserPattern: (id) => {
    const state = get();
    if (!state.userPatterns.some((p) => p.id === id)) return { ok: false, reason: 'not-a-custom-pattern' };

    const nextUserPatterns = state.userPatterns.filter((p) => p.id !== id);
    try { localStorage.setItem('kumiko_user_patterns', JSON.stringify(nextUserPatterns)); }
    catch { /* localStorage unavailable — the pattern is still gone for this session */ }

    const twin = state.findIdenticalPattern(id);
    const grid = useGridStore.getState();
    const movedCells = twin ? grid.replacePatternInSpaces(id, twin.id) : 0;
    const clearedCells = twin ? 0 : grid.removePatternFromSpaces(id);
    const wasActive = state.activePatternId === id;
    if (wasActive) useSelectionStore.getState().clearSelection();

    set((s) => {
      const { [id]: _removed, ...patternOverrides } = s.patternOverrides;
      const remaining = s.recentPatternIds.filter((pid) => pid !== id);
      const activePatternId = wasActive ? (remaining[0] ?? s.builtInPatterns[0].id) : s.activePatternId;
      return {
        userPatterns: nextUserPatterns,
        patternOverrides,
        activePatternId,
        recentPatternIds: remaining.length ? remaining : [activePatternId],
      };
    });
    return { ok: true, clearedCells, movedCells, movedTo: twin ? twin.name : null };
  },
}));

export default usePatternStore;

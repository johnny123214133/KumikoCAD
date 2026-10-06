import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import {
  mmToIn, inToMm, MM_STEP, STRIP_IN_STEP, MIN_STRIP_WIDTH_MM,
  roundUpToStripInStep, roundDownToMmStep, roundToMmStep, roundToStripInStep,
} from '../../geometry/units.js'
import OverlayControls from '../pattern-editor/OverlayControls.jsx'
import PatternParams from './PatternParams.jsx'

const sectionLabelStyle = { letterSpacing: '0.05em', fontSize: '11px' }

function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y) }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
function fmtPt(p) { return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})` }

// Cut role strings look like 'end', 'cut-top-2', 'cut-bottom-3' — see the
// factories. 'cut-top' / 'cut-bottom' name the FACE the notch is cut into, so
// a strip with a 'cut-bottom' sits on top of its crossing strip (and a strip
// that needs notches on both faces, like the middle strip of a three-way
// lap, simply has one cut of each). The "n-way" suffix is how many strips
// share the joint.
function describeCutRole(role) {
  if (role === 'end') return 'End (miter to grid boundary)'
  const m = /^cut-(top|bottom)-(\d+)$/.exec(role || '')
  if (m) {
    const [, face, n] = m
    return `Notch cut into ${face} face (${n}-way joint)`
  }
  return role || '—'
}

function StripCard({ strip, pattern }) {
  const length = dist(strip.start, strip.end)
  const mid = midpoint(strip.start, strip.end)
  return (
    <div className="border rounded p-2 mb-2" style={{ fontSize: '12px' }}>
      <div className="fw-semibold mb-1">Strip {strip.id}</div>
      <table className="table table-sm table-borderless mb-2" style={{ fontSize: '11px' }}>
        <tbody>
          <tr><td className="text-muted py-0 pe-2">Length</td><td className="py-0">{length.toFixed(2)} mm</td></tr>
          <tr><td className="text-muted py-0 pe-2">Start</td><td className="py-0">{fmtPt(strip.start)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">End</td><td className="py-0">{fmtPt(strip.end)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Midpoint</td><td className="py-0">{fmtPt(mid)}</td></tr>
        </tbody>
      </table>
      <div className="text-muted mb-1" style={{ fontSize: '10px', letterSpacing: '0.03em' }}>CUTS</div>
      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
        {strip.cuts.map((cut, i) => {
          const joint = pattern.joints.find(j => j.id === cut.jointId)
          return (
            <li key={i} className="ps-2 border-start">
              <div>{fmtPt(cut.position)} — {joint?.notchType ?? 'unknown'}, {cut.angle}°, depth {Number(cut.depth.toFixed(3))}</div>
              <div className="text-muted">{describeCutRole(cut.role)}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Inspector() {
  const getActivePattern = usePatternStore(s => s.getActivePattern)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const getEffectiveStripWidth = usePatternStore(s => s.getEffectiveStripWidth)
  const setPatternStripWidth = usePatternStore(s => s.setPatternStripWidth)
  const getEffectiveMaterial = usePatternStore(s => s.getEffectiveMaterial)
  const getEffectiveFinish = usePatternStore(s => s.getEffectiveFinish)
  const setPatternMaterial = usePatternStore(s => s.setPatternMaterial)
  const setPatternFinish = usePatternStore(s => s.setPatternFinish)
  const getEffectiveStripMaterial = usePatternStore(s => s.getEffectiveStripMaterial)
  const getEffectiveStripFinish = usePatternStore(s => s.getEffectiveStripFinish)
  const setStripsMaterial = usePatternStore(s => s.setStripsMaterial)
  const setStripsFinish = usePatternStore(s => s.setStripsFinish)
  const hasUnsavedChanges = usePatternStore(s => s.hasUnsavedChanges)
  const saveUserPattern = usePatternStore(s => s.saveUserPattern)
  const selectedStripIds = useSelectionStore(s => s.selectedStripIds)
  // Not read directly — subscribed so this re-renders (and the effect below
  // re-syncs the draft input) when patternOverrides changes for a reason
  // OTHER than this component's own edit, e.g. useGridStore.setCellWidth's
  // shrink-clamp broadcast reaching this pattern from outside.
  usePatternStore(s => s.patternOverrides)
  const pattern = getActivePattern()
  const stripsExpanded = useAppStore(s => s.stripsExpanded)
  const setStripsExpanded = useAppStore(s => s.setStripsExpanded)

  // Strip width is genuinely live now — draft is a plain string so the user
  // can freely clear/retype (a bare controlled number input fights you the
  // instant the field is empty), and only commits to the store (which does
  // its own clamping and IS what drives rendering everywhere this pattern
  // appears — pattern editor and every matching cell in the panel) when the
  // typed value parses to a valid positive number. Typing 0 or clearing the
  // field just doesn't commit — "don't update the render when set to 0" —
  // rather than reverting what's displayed.
  const effectiveWidthMm = getEffectiveStripWidth(activePatternId)
  const [widthUnit, setWidthUnit] = useState('mm')
  const [draftWidth, setDraftWidth] = useState(String(effectiveWidthMm))
  // Material/finish are genuinely live, AND scoped to the current selection:
  // with one or more strips selected (Selection/Multi-select tool), the
  // Wood/Finish selectors read and write THOSE strips' own override
  // (getEffectiveStripMaterial/Finish, setStripsMaterial/Finish) instead of
  // the whole pattern's — that's usePatternStore's applyStripColorOverrides
  // giving selected strips their own stripProperties entry rather than
  // sharing the pattern-wide default one. With nothing selected, this falls
  // back to the original whole-pattern behavior (setPatternMaterial/Finish).
  // Displayed value with a multi-strip selection is the FIRST selected
  // strip's own effective value — a batch-edit convention (matches how most
  // design tools show one representative value across a mixed selection);
  // changing it still applies to every selected strip, not just that one.
  const hasStripSelection = selectedStripIds.length > 0
  const material = hasStripSelection
    ? getEffectiveStripMaterial(activePatternId, selectedStripIds[0])
    : getEffectiveMaterial(activePatternId)
  const finish = hasStripSelection
    ? getEffectiveStripFinish(activePatternId, selectedStripIds[0])
    : getEffectiveFinish(activePatternId)

  const onMaterialChange = (value) => {
    if (hasStripSelection) setStripsMaterial(activePatternId, selectedStripIds, value)
    else setPatternMaterial(activePatternId, value)
  }
  const onFinishChange = (value) => {
    if (hasStripSelection) setStripsFinish(activePatternId, selectedStripIds, value)
    else setPatternFinish(activePatternId, value)
  }

  // Inches display uses 4 decimal places, not 3 — a 1/16" step (0.0625) needs
  // 4 decimal digits to show exactly. At 3 digits, successive steps
  // (0.0625, 0.1250, 0.1875, 0.2500...) round to 0.063, 0.125, 0.188, 0.250,
  // which alternates between .062 and .063 apart — the increments themselves
  // are perfectly uniform, but truncating to 3 decimals made them LOOK
  // uneven.
  useEffect(() => {
    setDraftWidth(String(Number((widthUnit === 'mm' ? effectiveWidthMm : mmToIn(effectiveWidthMm)).toFixed(widthUnit === 'mm' ? 2 : 4))))
  }, [activePatternId, effectiveWidthMm, widthUnit])

  // Save Pattern: the name field re-seeds from the active pattern's own
  // name whenever the selection changes (so it's always ready to edit
  // rather than carrying over stale text from a different pattern), but
  // stays free-typed in between — same draft-string spirit as the width
  // input, just without the numeric-parsing angle. The button itself is
  // disabled purely by hasUnsavedChanges(activePatternId), which is already
  // true "nothing to save yet" right after selecting ANY pattern (its
  // current recipe trivially equals its own canonical one) and only turns
  // false again once some parameter — width, wood, finish, or a per-strip
  // override — actually diverges from it, per the request that the button
  // stay disabled "until the parameters are updated."
  const [saveName, setSaveName] = useState(pattern?.name ?? '')
  useEffect(() => {
    setSaveName(pattern?.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatternId])

  if (!pattern) return null

  const canSave = hasUnsavedChanges(activePatternId)
  const handleSavePattern = () => {
    const result = saveUserPattern(saveName)
    if (!result.ok) {
      if (result.reason === 'duplicate') {
        toast.error(`A pattern with these exact parameters already exists: "${result.existingName}".`)
      }
      return
    }
    toast.success(`Saved as "${result.name}"`)
    setSaveName(result.name)
  }

  const onWidthInputChange = (e) => {
    const raw = e.target.value
    setDraftWidth(raw)
    const v = Number(raw)
    if (Number.isFinite(v) && v > 0) {
      setPatternStripWidth(activePatternId, widthUnit === 'mm' ? v : inToMm(v))
    }
  }

  // Free-typed values aren't forced onto the step grid keystroke-by-keystroke
  // (that would fight the user mid-edit — e.g. never letting them type a
  // "2" on the way to "25"). Instead, snap to the nearest step once the
  // field loses focus. Uses the store's current effective width (already
  // clamped to the min/max bounds by onWidthInputChange/setPatternStripWidth
  // above), rounds it to the nearest step in whichever unit is showing, and
  // refreshes the draft text so the box visibly reflects the snapped value.
  const onWidthInputBlur = () => {
    const snappedMm = widthUnit === 'mm'
      ? roundToMmStep(effectiveWidthMm)
      : inToMm(roundToStripInStep(effectiveWidthMm))
    setPatternStripWidth(activePatternId, Math.max(snappedMm, MIN_STRIP_WIDTH_MM))
  }

  // Fires only when the mm/in TOGGLE itself flips, not on every keystroke —
  // snaps the current width to a clean number in the newly-selected unit.
  // Opposite direction from the cell-width toggle: round UP to the nearest
  // 1/16" when switching TO inches (a finer metric value should never
  // quietly imply a narrower strip than what ends up displayed), round DOWN
  // to the nearest whole mm when switching TO mm (avoid ending up over a
  // limit purely from rounding up), with a hard 1mm floor either way.
  const onWidthUnitChange = (nextUnit) => {
    if (nextUnit === widthUnit) return
    setWidthUnit(nextUnit)
    const snappedMm = nextUnit === 'in'
      ? inToMm(roundUpToStripInStep(effectiveWidthMm))
      : roundDownToMmStep(effectiveWidthMm)
    setPatternStripWidth(activePatternId, Math.max(snappedMm, MIN_STRIP_WIDTH_MM))
  }

  // The HTML `min` attribute is also the base the browser's native
  // spinner/keyboard stepping counts from (valid values land on
  // min + n*step), so it has to sit exactly on the step grid itself —
  // otherwise increments come out uneven (e.g. 0.0394, 0.1019, 0.1644...
  // instead of clean 1/16" jumps). In mm, MIN_STRIP_WIDTH_MM (1) is already
  // a whole-mm multiple of MM_STEP, so it's used as-is. In inches, the
  // floor's raw conversion (~0.0394") isn't a multiple of STRIP_IN_STEP, so
  // it's rounded UP to the nearest 1/16" first — never rounded down, which
  // would put the floor's line below the true 1mm minimum.
  const minWidthDisplay = widthUnit === 'mm'
    ? MIN_STRIP_WIDTH_MM
    : Math.ceil(mmToIn(MIN_STRIP_WIDTH_MM) / STRIP_IN_STEP) * STRIP_IN_STEP

  return (
    <div>
      {/* Strips section — collapsed by default (state lives in useAppStore,
          not here, so it survives Inspector unmounting on a workspace
          switch). When expanded this is a FIXED max-height box with its own
          scroll, not a flex-grow region — flex-grow by construction fills
          exactly the space left over and can never overflow its container,
          which is why the rest of the panel (Strip properties, Overlays)
          used to always stay in view but this section could get squeezed to
          almost nothing. A fixed box lets total content genuinely exceed the
          panel's height when expanded, which is what lets RightPanel's
          existing overflow-auto wrapper actually activate and scroll the
          whole menu — that mechanism was already there, just never
          triggered before. */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="fw-semibold small text-uppercase text-muted" style={sectionLabelStyle}>
          Strips ({pattern.strips.length})
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          style={{ padding: '1px 8px', fontSize: '11px' }}
          onClick={() => setStripsExpanded(!stripsExpanded)}
          aria-expanded={stripsExpanded}
        >
          {stripsExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>
      {stripsExpanded && (
        <div className="overflow-auto mb-1" style={{ maxHeight: '55vh', minHeight: '220px' }}>
          {pattern.strips.map(strip => (
            <StripCard key={strip.id} strip={strip} pattern={pattern} />
          ))}
        </div>
      )}

      <hr className="my-3" />

      {/* Strip properties */}
      <div>
        <div className="d-flex align-items-baseline justify-content-between mb-2">
          <div className="fw-semibold small text-uppercase text-muted" style={sectionLabelStyle}>Strip properties</div>
          {hasStripSelection && (
            <div className="text-muted" style={{ fontSize: '11px' }}>
              {selectedStripIds.length} strip{selectedStripIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label small mb-1">Strip width</label>
          <div className="input-group input-group-sm">
            <input
              type="number"
              min={minWidthDisplay}
              step={widthUnit === 'mm' ? MM_STEP : STRIP_IN_STEP}
              className="form-control"
              value={draftWidth}
              onChange={onWidthInputChange}
              onBlur={onWidthInputBlur}
            />
            <select className="form-select" style={{ maxWidth: '70px', flex: '0 0 auto' }} value={widthUnit} onChange={(e) => onWidthUnitChange(e.target.value)}>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
          {hasStripSelection && (
            <div className="form-text" style={{ fontSize: '11px' }}>Applies to the whole pattern — width isn't per-strip yet.</div>
          )}
        </div>

        <div className="mb-2">
          <label className="form-label small mb-1">Wood{hasStripSelection ? ' (selected strips)' : ''}</label>
          <select className="form-select form-select-sm" value={material} onChange={(e) => onMaterialChange(e.target.value)}>
            {WOOD_OPTIONS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label small mb-1">Finish{hasStripSelection ? ' (selected strips)' : ''}</label>
          <select className="form-select form-select-sm" value={finish} onChange={(e) => onFinishChange(e.target.value)}>
            {FINISH_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Per-pattern parameters (e.g. Goma's inset) — built from whatever the
          active pattern's factory declares; renders nothing (including its
          own divider) for patterns with none. */}
      <PatternParams pattern={pattern} patternStripWidth={effectiveWidthMm} />

      <hr className="my-3" />

      {/* Overlay toggles — this used to live in the left panel, before that
          sidebar's pattern-list section was built out; the component itself
          was never deleted, just no longer imported anywhere. Reused as-is. */}
      <div>
        <OverlayControls />
      </div>

      <hr className="my-3" />

      {/* Save Pattern — records the CURRENT effective recipe (strip width,
          wood, finish, and any per-strip overrides) as a brand new named
          pattern in the library, rather than mutating the pattern being
          edited (built-ins are readOnly, and overwriting an existing user
          pattern in place isn't what was asked for here). See
          usePatternStore's saveUserPattern for the duplicate-recipe check
          and name-collision handling. */}
      <div>
        <div className="fw-semibold small text-uppercase text-muted mb-2" style={sectionLabelStyle}>Save pattern</div>
        <input
          type="text"
          className="form-control form-control-sm mb-2"
          placeholder="Pattern name"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-sm btn-primary w-100"
          disabled={!canSave}
          title={canSave ? undefined : 'Change the strip width, a pattern parameter, wood, or finish first'}
          onClick={handleSavePattern}
        >
          Save Pattern
        </button>
      </div>
    </div>
  )
}

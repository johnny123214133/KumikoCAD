import { curveLength } from '../../geometry/curve.js'
import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import usePatternStore, { stripWidthHidden } from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { WOOD_OPTIONS, finishOptionsFor, allowedFinish } from '../../geometry/materials.js'
import {
  mmToIn, inToMm, MM_STEP, STRIP_IN_STEP, MIN_STRIP_WIDTH_MM,
  roundToMmStep, roundToStripInStep, formatLength, toUnit,
} from '../../geometry/units.js'
import Accordion, { AccordionHeader, useSectionOpen } from '../shared/Accordion.jsx'
import ThemedSelect, { asOptions } from '../shared/ThemedSelect.jsx'
import { FieldLabel } from '../shared/HelpTip.jsx'
import ColorSwatchLine from '../shared/ColorSwatchLine.jsx'
import PatternParams from './PatternParams.jsx'

const sectionLabelStyle = { letterSpacing: '0.05em', fontSize: '11px' }

function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y) }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
function fmtPt(p, unit) { return `(${Number(toUnit(p.x, unit).toFixed(unit === 'in' ? 4 : 2))}, ${Number(toUnit(p.y, unit).toFixed(unit === 'in' ? 4 : 2))}) ${unit}` }

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
  const unit = useAppStore(s => s.gridUnit)
  const len = (mm) => formatLength(mm, unit)
  const chord = dist(strip.start, strip.end)
  // A bent strip's length is its arc length (the number to cut it to); the chord is how far apart its ends are.
  const length = strip.curve ? curveLength(chord, strip.curve) : chord
  const mid = midpoint(strip.start, strip.end)
  return (
    <div className="border rounded p-2 mb-2" style={{ fontSize: '12px' }}>
      <div className="fw-semibold mb-1">Strip {strip.id}</div>
      <table className="table table-sm table-borderless mb-2" style={{ fontSize: '11px' }}>
        <tbody>
          <tr><td className="text-muted py-0 pe-2">Length</td><td className="py-0">{len(length)}</td></tr>
          {strip.curve?.lead > 0 && <tr><td className="text-muted py-0 pe-2">Straight ends</td><td className="py-0">{len(strip.curve.lead)} each</td></tr>}
          {(strip.curve?.startLead > 0 || strip.curve?.endLead > 0) && <tr><td className="text-muted py-0 pe-2">Straight ends</td><td className="py-0">{len(strip.curve.startLead || 0)} / {len(strip.curve.endLead || 0)}</td></tr>}
          {strip.curve && <tr><td className="text-muted py-0 pe-2">Chord / bow</td><td className="py-0">{len(chord)} / {len(Math.abs(strip.curve.sagitta))}</td></tr>}
          <tr><td className="text-muted py-0 pe-2">Start</td><td className="py-0">{fmtPt(strip.start, unit)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">End</td><td className="py-0">{fmtPt(strip.end, unit)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Midpoint</td><td className="py-0">{fmtPt(mid, unit)}</td></tr>
        </tbody>
      </table>
      <div className="text-muted mb-1" style={{ fontSize: '10px', letterSpacing: '0.03em' }}>CUTS</div>
      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
        {strip.cuts.map((cut, i) => {
          const joint = pattern.joints.find(j => j.id === cut.jointId)
          return (
            <li key={i} className="ps-2 border-start">
              <div>{fmtPt(cut.position, unit)} — {joint?.notchType ?? 'unknown'}, {cut.angle}°, depth {len(cut.depth)}</div>
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
  const stripWidthMaxMm = usePatternStore(s => s.getStripWidthMax(activePatternId))
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
  const saveChanges = usePatternStore(s => s.saveChanges)
  const setAsDefault = usePatternStore(s => s.setAsDefault)
  const revertToDefault = usePatternStore(s => s.revertToDefault)
  const defaultOverridden = usePatternStore(s => !!s.builtInDefaults[s.activePatternId])
  const selectedStripIds = useSelectionStore(s => s.selectedStripIds)
  // Not read directly — subscribed so this re-renders (and the effect below
  // re-syncs the draft input) when patternOverrides changes for a reason
  // OTHER than this component's own edit, e.g. useGridStore.setCellWidth's
  // shrink-clamp broadcast reaching this pattern from outside.
  usePatternStore(s => s.patternOverrides)
  const pattern = getActivePattern()
  // The Save Pattern section stays pinned to the bottom of the panel; it can be folded away (open to start with).
  const [saveOpen, toggleSave] = useSectionOpen('pe.save', true)

  // Strip width is genuinely live now — draft is a plain string so the user
  // can freely clear/retype (a bare controlled number input fights you the
  // instant the field is empty), and only commits to the store (which does
  // its own clamping and IS what drives rendering everywhere this pattern
  // appears — pattern editor and every matching cell in the panel) when the
  // typed value parses to a valid positive number. Typing 0 or clearing the
  // field just doesn't commit — "don't update the render when set to 0" —
  // rather than reverting what's displayed.
  const effectiveWidthMm = getEffectiveStripWidth(activePatternId)
  // The CAD-wide unit (the toggle at the top of this panel).
  const widthUnit = useAppStore(s => s.gridUnit)
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
    if (hasStripSelection) {
      setStripsMaterial(activePatternId, selectedStripIds, value)
      // a wood that isn't offered in the current finish (Purpleheart) takes its unfinished look
      if (allowedFinish(value, finish) !== finish) setStripsFinish(activePatternId, selectedStripIds, allowedFinish(value, finish))
    } else setPatternMaterial(activePatternId, value)
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

  // Save changes: writes the open custom pattern's state back into itself.
  const handleSaveChanges = () => {
    const result = saveChanges(activePatternId)
    if (!result.ok) {
      if (result.reason === 'duplicate') {
        toast.error(`A pattern with these exact parameters already exists: "${result.existingName}".`)
      }
      return
    }
    toast.success(`Saved changes to "${result.name}"`)
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

  // (When the unit flips, setUnit — store/unitActions.js — snaps the width and the
  // parameters onto the new unit's step grids.)

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

  // Set / Revert to Default only exist for the built-in library patterns (not
  // custom ones, and not the blank pattern, which has nothing to set).
  const isBuiltIn = !!pattern.readOnly && activePatternId !== 'builtin:blank'

  const widthMaxDisplay = Number((widthUnit === 'mm' ? stripWidthMaxMm : mmToIn(stripWidthMaxMm)).toFixed(4))

  // The Save Pattern section is pinned to the bottom of the panel; everything
  // above it scrolls. Each section above it is its own accordion (open/closed
  // state in useAppStore, so it survives this menu unmounting on a workspace
  // switch): Pattern Parameters and Strip Properties start open.
  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
      {/* Strip width and whatever other parameters the active pattern's factory
          declares (e.g. Goma's inset) — each with a hover tooltip for its
          description and the range it can take right now. */}
      <Accordion id="pe.params" title="Pattern Parameters" defaultOpen>
        {!stripWidthHidden(pattern.basePatternId ?? pattern.id) && (
          <div className="mb-3">
            <FieldLabel
              label="Strip width"
              htmlFor="pattern-strip-width"
              tip="Width of the pattern's strips. It applies to the whole pattern — width isn't per-strip yet."
            />
            <div className="input-group input-group-sm">
              <input
                id="pattern-strip-width"
                type="number"
                min={minWidthDisplay}
                max={widthMaxDisplay}
                step={widthUnit === 'mm' ? MM_STEP : STRIP_IN_STEP}
                className="form-control"
                value={draftWidth}
                onChange={onWidthInputChange}
                onBlur={onWidthInputBlur}
              />
              <span className="input-group-text">{widthUnit}</span>
            </div>
            <div className="form-text" style={{ fontSize: '11px' }}>Range {Number(minWidthDisplay.toFixed(widthUnit === 'mm' ? 2 : 4))}–{Number(widthMaxDisplay.toFixed(widthUnit === 'mm' ? 2 : 4))} {widthUnit}</div>
          </div>
        )}
        <PatternParams pattern={pattern} patternStripWidth={effectiveWidthMm} />
      </Accordion>

      <Accordion
        id="pe.props"
        title="Strip Properties"
        defaultOpen
        right={hasStripSelection && (
          <div className="text-muted" style={{ fontSize: '11px' }}>
            {selectedStripIds.length} strip{selectedStripIds.length > 1 ? 's' : ''} selected
          </div>
        )}
      >
        <ColorSwatchLine className="" material={material} finish={finish} onPick={(w, f) => { onMaterialChange(w); onFinishChange(f) }} />
      </Accordion>

      {/* The strips' cut details. A fixed max-height box with its own scroll: the
          section can grow past the panel's height, and RightPanel's overflow-auto
          wrapper then scrolls the whole menu. */}
      <Accordion id="pe.strips" title={`Strips (${pattern.strips.length})`}>
        <div className="overflow-auto" style={{ maxHeight: '55vh', minHeight: '220px' }}>
          {pattern.strips.map(strip => (
            <StripCard key={strip.id} strip={strip} pattern={pattern} />
          ))}
        </div>
      </Accordion>

      </div>

      <div className="flex-shrink-0 border-top pt-3 mt-2">
        <AccordionHeader open={saveOpen} onToggle={toggleSave} controls="section-pe.save">Save pattern</AccordionHeader>
        {saveOpen && <div id="section-pe.save" className="mt-2">
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
          Save as New Pattern
        </button>
        {!pattern.readOnly && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary w-100 mt-2"
            disabled={!canSave}
            title={canSave ? 'Save the changes to this pattern' : 'Change the strip width, a pattern parameter, wood, or finish first'}
            onClick={handleSaveChanges}
          >
            Save changes
          </button>
        )}
        {isBuiltIn && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100 mt-2"
              disabled={!canSave}
              title={canSave ? 'Make the current settings this pattern\'s default' : 'Change the strip width, a pattern parameter, wood, or finish first'}
              onClick={() => {
                const r = setAsDefault(activePatternId)
                // Cells already using the old default stay on a custom copy of it.
                if (r?.cellsMoved) toast.info(`${r.cellsMoved} placed ${r.cellsMoved === 1 ? 'cell keeps' : 'cells keep'} the old default as "${r.copyName}"`)
              }}
            >
              Set as Default
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100 mt-2"
              disabled={!defaultOverridden}
              title={defaultOverridden ? 'Go back to this pattern\'s original built-in settings' : 'This pattern is still on its original built-in settings'}
              onClick={() => revertToDefault(activePatternId)}
            >
              Revert to Default
            </button>
          </>
        )}
        </div>}
      </div>
    </div>
  )
}

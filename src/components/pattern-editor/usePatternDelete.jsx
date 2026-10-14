import React, { useState, useCallback } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useGridStore from '../../store/useGridStore.js'
import useAppStore from '../../store/useAppStore.js'
import ConfirmDeletePattern from './ConfirmDeletePattern.jsx'

// Delete-a-custom-pattern UI shared by every list of pattern cards (the
// library and Recently Used, in both workspaces — they're the same left
// panel). Returns:
//   deleteButton(pattern) — the hover (x) for a card's top-right corner, or
//     null for built-ins (only custom patterns can be deleted). Put it next to
//     the card's select button inside a `.pattern-card` wrapper.
//   deleteDialog — the "are you sure?" dialog (or null); render it once.
export default function usePatternDelete() {
  const deleteUserPattern = usePatternStore(s => s.deleteUserPattern)
  // The custom pattern awaiting an "are you sure?" answer, if any.
  const [pending, setPending] = useState(null)
  const cancel = useCallback(() => setPending(null), [])
  const confirm = ({ dontAskAgain } = {}) => {
    if (dontAskAgain) useAppStore.getState().setConfirmDeletePattern(false)
    deleteUserPattern(pending.id)
    setPending(null)
  }

  // A sibling of the card's select button (a button can't contain a button);
  // it stops the click so deleting never also selects the pattern.
  const deleteButton = (p) => p.readOnly ? null : (
    <button
      type="button"
      className="pattern-delete"
      title={`Delete ${p.name}`}
      aria-label={`Delete ${p.name}`}
      onClick={(e) => {
        e.stopPropagation()
        // "Don't show again" was ticked earlier this session: just delete.
        if (!useAppStore.getState().confirmDeletePattern) deleteUserPattern(p.id)
        else setPending(p)
      }}
    >
      &times;
    </button>
  )

  const deleteDialog = pending && (
    <ConfirmDeletePattern
      pattern={pending}
      placedCount={useGridStore.getState().countSpacesWithPattern(pending.id)}
      twinName={usePatternStore.getState().findIdenticalPattern(pending.id)?.name ?? null}
      onConfirm={confirm}
      onCancel={cancel}
    />
  )

  return { deleteButton, deleteDialog }
}

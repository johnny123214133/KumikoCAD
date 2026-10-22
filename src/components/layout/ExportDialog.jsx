import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import { PAPER_CHOICES } from '../../export/paper.js'
import { exportPartsPdf, exportPartsXlsx, exportLayoutPdf, layoutSheetCount } from '../../store/exportActions.js'
import { formatLength } from '../../geometry/units.js'

// Export / print: the parts list as a PDF (with tick boxes to follow while building) or a spreadsheet,
// and the panel as a full-size 1:1 layout on sheets of paper. Opens from the File menu's ▾ and the command palette.
export default function ExportDialog() {
  const open = useAppStore((s) => s.exportDialogOpen)
  const setOpen = useAppStore((s) => s.setExportDialogOpen)
  const paper = useAppStore((s) => s.printPaper)
  const setPaper = useAppStore((s) => s.setPrintPaper)
  const unit = useAppStore((s) => s.gridUnit)
  const grid = useGridStore((s) => s)
  const [busy, setBusy] = useState(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !busy) setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, setOpen])

  const sheets = useMemo(() => (open ? layoutSheetCount(paper) : null), [open, paper, grid.cols, grid.rows, grid.cellWidth, grid.orientation, grid.cornerBehavior, grid.gridStripWidth, grid.borderWidth, grid.borderCorner])
  if (!open) return null
  const go = (id, fn) => async () => { setBusy(id); try { await fn() } finally { setBusy(null) } }
  const card = (id, title, text, label, fn) => (
    <div className="border rounded p-2 mb-2" key={id}>
      <div className="d-flex align-items-start gap-2">
        <div className="flex-grow-1">
          <div className="fw-semibold small">{title}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{text}</div>
        </div>
        <button type="button" className="btn btn-sm btn-dark flex-shrink-0" disabled={!!busy} onClick={go(id, fn)}>{busy === id ? 'Working…' : label}</button>
      </div>
    </div>
  )
  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2000 }} />
      <div className="modal d-block" style={{ zIndex: 2001 }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="export-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false) }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header py-2"><h6 className="modal-title" id="export-title">Export and print</h6></div>
            <div className="modal-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="small text-muted">Paper</span>
                <div className="btn-group btn-group-sm" role="group" aria-label="Paper size">
                  {PAPER_CHOICES.map((p) => (
                    <button key={p.id} type="button" className={`btn ${paper === p.id ? 'btn-dark' : 'btn-outline-secondary'}`} aria-pressed={paper === p.id} onClick={() => setPaper(p.id)}>{p.label}</button>
                  ))}
                </div>
              </div>
              {card('layout', '1:1 layout',
                `The whole panel at full size, every piece outlined, on ${sheets.sheets} ${sheets.sheets === 1 ? 'sheet' : 'sheets'} (${sheets.nx} across × ${sheets.ny} down, ${sheets.landscape ? 'landscape' : 'portrait'}) of ${paper === 'a4' ? 'A4' : 'US Letter'}. Each sheet has its number, the number of the sheet that joins each side, and overlap and registration marks. The panel is ${formatLength(sheets.width, unit)} × ${formatLength(sheets.height, unit)}. Print at 100%.`,
                'Save PDF', exportLayoutPdf)}
              {card('pdf', 'Parts list (PDF)', 'Every strip by section and pattern with its cuts, and a box beside each section, pattern and strip to tick off as you build.', 'Save PDF', exportPartsPdf)}
              {card('xlsx', 'Parts list (spreadsheet)', 'An Excel workbook (.xlsx; opens in Numbers, Google Sheets and LibreOffice too): the same hierarchy as collapsible rows with a Done column, plus a flat cut list to sort and filter.', 'Save .xlsx', exportPartsXlsx)}
            </div>
            <div className="modal-footer py-2">
              <button ref={closeRef} type="button" className="btn btn-sm btn-outline-secondary" disabled={!!busy} onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

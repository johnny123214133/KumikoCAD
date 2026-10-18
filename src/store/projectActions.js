import { toast } from 'react-toastify';
import useGridStore from './useGridStore.js';
import usePatternStore, { recipeKey, storedParams } from './usePatternStore.js';
import useSelectionStore from './useSelectionStore.js';
import useAppStore from './useAppStore.js';
import useProjectStore from './useProjectStore.js';
import { parseProjectText, stringifyProject, ProjectFileError, FILE_EXTENSION, MAX_FILE_BYTES } from './projectFormat.js';
import { saveTextFile, openTextFile } from './fileService.js';

// Save and Open for the panel project. The panel is saved with every pattern it uses embedded
// (see projectFormat.js); opening one builds those patterns and adds the ones the library
// doesn't already have.

let fileHandle = null; // the file Save writes back to (browsers with the File System Access API)

const BLANK = 'builtin:blank';
const DEFAULT_NAME = 'Untitled panel';

// ── Building the document from the app's state ────────────────────────────────────────────
export function buildProjectDocument() {
  const grid = useGridStore.getState();
  const patternStore = usePatternStore.getState();
  const all = [...patternStore.builtInPatterns, ...patternStore.userPatterns];
  const cells = {};
  const patterns = {};
  const idFor = new Map(); // library pattern id -> id inside the file
  for (const cellId of Object.keys(grid.spacePatterns).sort()) {
    const libId = grid.spacePatterns[cellId];
    if (!libId || libId === BLANK) continue;
    const recipe = patternStore.getCurrentRecipe(libId);
    if (!recipe) continue; // points at a pattern that no longer exists
    if (!idFor.has(libId)) {
      const key = `p${idFor.size + 1}`;
      idFor.set(libId, key);
      patterns[key] = {
        name: all.find((p) => p.id === libId)?.name ?? 'Pattern',
        recipe: {
          basePatternId: recipe.basePatternId,
          patternStripWidth: recipe.patternStripWidth,
          material: recipe.material,
          finish: recipe.finish,
          params: storedParams(recipe.basePatternId, recipe.params),
          stripMaterials: recipe.stripMaterials ?? {},
        },
      };
    }
    const x = grid.spaceXforms[cellId] ?? { rot: 0, flip: false };
    cells[cellId] = { pattern: idFor.get(libId), rot: x.rot ?? 0, flip: !!x.flip };
  }
  return {
    panel: {
      cols: grid.cols, rows: grid.rows, cellWidth: grid.cellWidth, gridStripWidth: grid.gridStripWidth,
      borderWidth: grid.borderWidth, borderCorner: grid.borderCorner, panelDepth: grid.panelDepth, orientation: grid.orientation, cornerBehavior: grid.cornerBehavior, material: grid.material, finish: grid.finish,
      placementFlip: !!grid.placementFlip, cells,
    },
    patterns,
  };
}

// A fingerprint of the project as it would be saved now (without the save time).
export const projectKey = () => stringifyProject(buildProjectDocument());

// ── Applying a read document to the app ───────────────────────────────────────────────────
// Returns { added, reused } — how many of the file's patterns were new to the library.
export function applyProjectDocument({ panel, patterns }) {
  const mapped = {}; // id in the file -> library id
  let added = 0, reused = 0;
  for (const [fileId, entry] of Object.entries(patterns)) {
    const state = usePatternStore.getState();
    const key = recipeKey(entry.recipe);
    // A library pattern with exactly this recipe is used as it is (built-ins first). One with
    // unsaved edits in this session is skipped — it is not what its saved recipe says.
    const clean = (p) => !Object.keys(state.patternOverrides[p.id] ?? {}).length && recipeKey(state.getTemplateRecipe(p)) === key;
    const match = state.builtInPatterns.find(clean) ?? state.userPatterns.find(clean);
    if (match) { mapped[fileId] = match.id; reused++; continue; }
    mapped[fileId] = state.addRecipePattern(entry.recipe, state.generateUniqueName(entry.name));
    added++;
  }
  const spacePatterns = {};
  const spaceXforms = {};
  for (const [cellId, c] of Object.entries(panel.cells)) {
    spacePatterns[cellId] = mapped[c.pattern];
    spaceXforms[cellId] = { rot: c.rot, flip: c.flip };
  }
  useSelectionStore.getState().clearSelection();
  useAppStore.setState({ validationActive: false, validationPinnedId: null, validationReturn: null });
  useGridStore.setState({
    cols: panel.cols, rows: panel.rows, cellWidth: panel.cellWidth, gridStripWidth: panel.gridStripWidth,
    borderWidth: panel.borderWidth, borderCorner: panel.borderCorner, panelDepth: panel.panelDepth, orientation: panel.orientation, cornerBehavior: panel.cornerBehavior, material: panel.material, finish: panel.finish,
    placementFlip: panel.placementFlip, spacePatterns, spaceXforms,
  });
  usePatternStore.getState().clampAllStripWidths();
  return { added, reused };
}

// ── Names ─────────────────────────────────────────────────────────────────────────────────
export const stripExtension = (fileName) => fileName.replace(/\.kumiko\.json$/i, '').replace(/\.json$/i, '');
const fileSafe = (name) => (name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim().slice(0, 100) || DEFAULT_NAME);
export const fileNameFor = (name) => `${fileSafe(name)}${FILE_EXTENSION}`;

export function renameProject(name) {
  const next = name.trim();
  if (!next || next === useProjectStore.getState().name) return;
  useProjectStore.getState().setName(next);
  fileHandle = null; // the old file is no longer "this project's" file: the next Save asks where
}

// ── Save / Open ───────────────────────────────────────────────────────────────────────────
export async function saveProject({ saveAs = false } = {}) {
  const project = useProjectStore.getState();
  if (project.busy) return false;
  project.setBusy(true);
  try {
    const doc = buildProjectDocument();
    const text = stringifyProject(doc, { savedAt: new Date().toISOString() });
    const result = await saveTextFile({ text, suggestedName: fileNameFor(project.name), handle: fileHandle, saveAs });
    if (!result) return false;
    fileHandle = result.handle;
    // Keep the name the user chose in the picker.
    if (result.how === 'file') useProjectStore.getState().setName(stripExtension(result.name) || project.name);
    useProjectStore.getState().setSavedKey(stringifyProject(doc));
    toast.success(result.how === 'file' ? `Saved ${result.name}` : `Saved ${result.name} to your downloads`);
    return true;
  } catch (error) {
    console.error('[project] save failed', error);
    toast.error('The project couldn’t be saved. Nothing was changed.');
    return false;
  } finally {
    useProjectStore.getState().setBusy(false);
  }
}

export async function openProject() {
  const project = useProjectStore.getState();
  if (project.busy) return false;
  project.setBusy(true);
  try {
    const file = await openTextFile(); // first, while the click still counts as a user gesture in every browser
    if (!file) return false;
    if (file.text.length > MAX_FILE_BYTES) throw new ProjectFileError('The file is too large to be a project.');
    const doc = parseProjectText(file.text); // throws, with a message, before anything is touched
    const name = stripExtension(file.name) || DEFAULT_NAME;
    if (useProjectStore.getState().dirty) {
      const ok = await useProjectStore.getState().ask({
        title: 'Replace the current project?',
        message: `“${useProjectStore.getState().name}” has changes that haven’t been saved. Opening “${name}” will replace it.`,
        confirmLabel: 'Open and discard changes',
      });
      if (!ok) return false;
    }
    const { added } = applyProjectDocument(doc);
    fileHandle = file.handle;
    useProjectStore.getState().setName(name);
    useProjectStore.getState().setSavedKey(projectKey());
    toast.success(added ? `Opened ${name} (added ${added} custom ${added === 1 ? 'pattern' : 'patterns'} to your library)` : `Opened ${name}`);
    return true;
  } catch (error) {
    if (error instanceof ProjectFileError) toast.error(error.message);
    else { console.error('[project] open failed', error); toast.error('That file couldn’t be opened.'); }
    return false;
  } finally {
    useProjectStore.getState().setBusy(false);
  }
}

// ── Unsaved-changes tracking ──────────────────────────────────────────────────────────────
// Call once at startup. Marks the project changed whenever what would be saved differs from
// what was last saved (checked shortly after the stores settle), keeps the tab title in step,
// and asks the browser to confirm before the tab is closed with unsaved changes.
export function startProjectTracking() {
  const project = useProjectStore.getState();
  project.setSavedKey(projectKey());
  let timer = null;
  const check = () => {
    timer = null;
    const p = useProjectStore.getState();
    const dirty = projectKey() !== p.savedKey;
    if (dirty !== p.dirty) p.setDirty(dirty);
  };
  const schedule = () => { if (!timer) timer = setTimeout(check, 250); };
  const unsubs = [useGridStore.subscribe(schedule), usePatternStore.subscribe(schedule)];
  const title = () => {
    const { name, dirty } = useProjectStore.getState();
    document.title = `${dirty ? '• ' : ''}${name} — Kumiko CAD`;
  };
  title();
  unsubs.push(useProjectStore.subscribe(title));
  const beforeUnload = (e) => {
    if (!useProjectStore.getState().dirty) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', beforeUnload);
  return () => { unsubs.forEach((u) => u()); window.removeEventListener('beforeunload', beforeUnload); clearTimeout(timer); };
}

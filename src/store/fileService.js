// Reading and writing project files — in a browser (all four major ones) or in the Tauri desktop app.
//
//  • Tauri (the desktop app, src-tauri/): the native open/save dialogs and the file system plugin,
//    reached through window.__TAURI__ (app.withGlobalTauri in tauri.conf.json), so the web build
//    needs no Tauri packages at all. Save writes straight back to the file that was opened or last
//    saved.
//  • Chrome / Edge (secure context): the File System Access API — Save writes straight back to
//    the file that was opened or last saved, Save As and Open use the system pickers.
//  • Firefox / Safari (and anything without that API): Open uses a hidden file input, Save
//    downloads a copy (the browser decides the folder, and may rename a repeat save "name (1)").
//
// Callers get the same results either way. A cancelled dialog resolves to null.

const PICKER_TYPES = [{ description: 'Kumiko CAD project', accept: { 'application/json': ['.json'] } }];

export const hasFilePicker = () =>
  typeof window !== 'undefined' && window.isSecureContext && typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';

const isAbort = (e) => e?.name === 'AbortError';

// ── The desktop app
const tauri = () => (typeof window !== 'undefined' ? window.__TAURI__ : undefined);
export const hasTauri = () => !!(tauri()?.dialog && tauri()?.fs);
const TAURI_FILTERS = [{ name: 'Kumiko CAD project', extensions: ['json'] }];
const baseName = (path) => String(path).split(/[\\/]/).pop();

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Writes `text`. `handle` (from an earlier call) saves in place; `saveAs` or no handle asks
// where. Resolves { name, handle, how: 'file' | 'download' }, or null if cancelled.
export async function saveTextFile({ text, suggestedName, handle, saveAs }) {
  if (hasTauri()) {
    const { dialog, fs } = tauri();
    let path = saveAs ? null : handle?.path;
    if (!path) path = await dialog.save({ defaultPath: suggestedName, filters: TAURI_FILTERS });
    if (!path) return null;
    try {
      await fs.writeTextFile(path, text);
    } catch (e) {
      if (handle && !saveAs) return saveTextFile({ text, suggestedName, saveAs: true }); // file moved or permission lost: ask where
      throw e;
    }
    const name = baseName(path);
    return { name, handle: { path, name }, how: 'file' };
  }
  if (hasFilePicker()) {
    try {
      let target = saveAs ? null : handle;
      if (!target) target = await window.showSaveFilePicker({ suggestedName, types: PICKER_TYPES });
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      return { name: target.name, handle: target, how: 'file' };
    } catch (e) {
      if (isAbort(e)) return null;
      if (handle && !saveAs) return saveTextFile({ text, suggestedName, saveAs: true }); // file moved or permission lost: ask where
      throw e;
    }
  }
  download(suggestedName, text);
  return { name: suggestedName, handle: null, how: 'download' };
}

// Asks for a file and reads it. Resolves { name, text, handle }, or null if cancelled.
export async function openTextFile() {
  if (hasTauri()) {
    const { dialog, fs } = tauri();
    const path = await dialog.open({ multiple: false, directory: false, filters: TAURI_FILTERS });
    if (!path) return null;
    const name = baseName(path);
    return { name, text: await fs.readTextFile(path), handle: { path, name } };
  }
  if (hasFilePicker()) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: PICKER_TYPES, multiple: false });
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    const done = (value) => { input.remove(); resolve(value); };
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      try { const text = await file.text(); input.remove(); resolve({ name: file.name, text, handle: null }); } catch (e) { input.remove(); reject(e); }
    });
    input.addEventListener('cancel', () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}

// Writes a binary file (the PDF and spreadsheet exports). Always asks where (these are exports, not the project), except in a
// browser without a save dialog, where it downloads. Resolves { name, how: 'file' | 'download' }, or null if cancelled.
//   bytes Uint8Array · suggestedName 'panel.pdf' · mime 'application/pdf' · description 'PDF document'
export async function saveBinaryFile({ bytes, suggestedName, mime, description }) {
  const ext = `.${suggestedName.split('.').pop()}`;
  if (hasTauri()) {
    const { dialog, fs } = tauri();
    const path = await dialog.save({ defaultPath: suggestedName, filters: [{ name: description, extensions: [ext.slice(1)] }] });
    if (!path) return null;
    await fs.writeFile(path, bytes);
    return { name: baseName(path), how: 'file' };
  }
  if (hasFilePicker()) {
    try {
      const target = await window.showSaveFilePicker({ suggestedName, types: [{ description, accept: { [mime]: [ext] } }] });
      const writable = await target.createWritable();
      await writable.write(bytes);
      await writable.close();
      return { name: target.name, how: 'file' };
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { name: suggestedName, how: 'download' };
}

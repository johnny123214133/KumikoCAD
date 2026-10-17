// Reading and writing project files in a browser, the same for all four major ones.
//
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

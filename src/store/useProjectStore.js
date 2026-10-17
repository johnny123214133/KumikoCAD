import { create } from 'zustand';

// The open project, as the session sees it: its name, whether it has changes the file
// doesn't, and a pending "replace unsaved changes?" question for the dialog to show.
// (The file handle the browser gave us for in-place saves lives in projectActions.js — it
// isn't plain data.)
const useProjectStore = create((set) => ({
  name: 'Untitled panel',
  dirty: false,
  savedKey: null,        // fingerprint of the project as last saved / opened
  busy: false,           // a save or open is in progress
  confirm: null,         // { title, message, confirmLabel, resolve } while a dialog is up
  setName: (name) => set({ name }),
  setDirty: (dirty) => set({ dirty }),
  setSavedKey: (savedKey) => set({ savedKey, dirty: false }),
  setBusy: (busy) => set({ busy }),
  ask: (options) => new Promise((resolve) => set({ confirm: { ...options, resolve } })),
  answer: (value) => set((s) => { s.confirm?.resolve(value); return { confirm: null }; }),
}));

export default useProjectStore;

import { create } from 'zustand';
import asanoha from '../patterns/asanoha.json';
import tsumiishiKikko from '../patterns/tsumiishi-kikko.json';
import goma from '../patterns/goma.json';
import mikado from '../patterns/mikado.json';
import { validatePattern } from '../geometry/schema/validate.js';

// NOTE: patterns/asanoha-one.json was previously imported here as a built-in.
// It's a 1-strip scratch/test file (not one of the four canonical patterns from
// the implementation plan) and fails validation — its joint j0 references strips
// s1/s2 that don't exist. Worse, it was BUILT_INS[0], so it was the pattern the
// app loaded by default, making the app look broken/empty on first launch. Removed.
const BUILT_INS = [asanoha, tsumiishiKikko, goma, mikado];

BUILT_INS.forEach((p) => {
  const errs = validatePattern(p);
  if (errs.length) console.error(`[validation] ${p.id}:`, errs);
  else console.log(`[validation] ${p.id}: OK`);
});

function loadUserPatterns() {
  try { return JSON.parse(localStorage.getItem('kumiko_user_patterns') || '[]'); }
  catch { return []; }
}

const usePatternStore = create((set, get) => ({
  builtInPatterns: BUILT_INS,
  userPatterns: loadUserPatterns(),
  activePatternId: BUILT_INS[0].id,
  setActivePattern: (id) => set({ activePatternId: id }),
  getActivePattern: () => {
    const { builtInPatterns, userPatterns, activePatternId } = get();
    return [...builtInPatterns, ...userPatterns].find(p => p.id === activePatternId) ?? builtInPatterns[0];
  },
  forkPattern: (id) => { /* TODO */ },
  saveUserPattern: (pattern) => { /* TODO */ },
  deleteUserPattern: (id) => { /* TODO */ },
}));

export default usePatternStore;

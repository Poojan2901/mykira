import { create } from 'zustand'
import { getChapter, isExplore } from '../content/chapters'

export const useStory = create((set, get) => ({
  progress: 0,
  chapter: 'void',
  mode: 'scroll',
  focusId: null,
  starFocus: null,
  seen: [],
  letterDone: false,
  answer: null,     // null | 'yes' | 'time'
  answerAt: 0,      // performance.now() when answered

  setProgress: (p) => {
    const chapter = getChapter(p).id
    const mode = isExplore(p) ? 'explore' : 'scroll'
    const prev = get()
    const keep = mode === 'explore' && chapter === prev.chapter
    set({
      progress: p,
      chapter,
      mode,
      focusId: keep ? prev.focusId : null,
      starFocus: keep ? prev.starFocus : null,
    })
  },

  setFocus: (id) => set({ focusId: id }),
  setStarFocus: (id) => set({ starFocus: id }),
  markSeen: (i) => set((s) => (s.seen.includes(i) ? s : { seen: [...s.seen, i] })),
  setLetterDone: () => set({ letterDone: true }),
  setAnswer: (a) => set({ answer: a, answerAt: performance.now() }),
}))
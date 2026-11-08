/**
 * Pure helpers for the homepage chapter walk. Kept tiny and dependency-free so
 * the scroll-story engine (GSAP + Lenis) can stay thin and testable.
 */

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Which chapter a 0..1 scroll progress falls in. Rounds to the nearest chapter
 * so the crossfade flips at the midpoint between two chapters.
 */
export function chapterFromProgress(progress, count) {
  if (count <= 1) return 0
  return clamp(Math.round(progress * (count - 1)), 0, count - 1)
}

/**
 * 0..1 scroll progress that focuses a given chapter.
 */
export function progressForChapter(index, count) {
  if (count <= 1) return 0
  return clamp(index, 0, count - 1) / (count - 1)
}

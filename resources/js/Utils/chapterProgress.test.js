import { describe, expect, it } from 'vitest'
import {
  chapterFromProgress,
  clamp,
  progressForChapter,
} from './chapterProgress.js'

describe('clamp', () => {
  it('bounds within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('chapterFromProgress', () => {
  it('maps the ends to the first and last chapter', () => {
    expect(chapterFromProgress(0, 5)).toBe(0)
    expect(chapterFromProgress(1, 5)).toBe(4)
  })

  it('flips at the midpoint between chapters', () => {
    // 5 chapters => centres at 0, .25, .5, .75, 1; midpoints at .125, .375 ...
    expect(chapterFromProgress(0.12, 5)).toBe(0)
    expect(chapterFromProgress(0.13, 5)).toBe(1)
    expect(chapterFromProgress(0.37, 5)).toBe(1)
    expect(chapterFromProgress(0.38, 5)).toBe(2)
    expect(chapterFromProgress(0.62, 5)).toBe(2)
    expect(chapterFromProgress(0.63, 5)).toBe(3)
    expect(chapterFromProgress(0.87, 5)).toBe(3)
    expect(chapterFromProgress(0.88, 5)).toBe(4)
  })

  it('handles a single chapter', () => {
    expect(chapterFromProgress(0.5, 1)).toBe(0)
  })
})

describe('progressForChapter', () => {
  it('is the inverse of chapterFromProgress at centres', () => {
    for (let i = 0; i < 5; i++) {
      expect(chapterFromProgress(progressForChapter(i, 5), 5)).toBe(i)
    }
  })

  it('clamps out-of-range indices', () => {
    expect(progressForChapter(-3, 5)).toBe(0)
    expect(progressForChapter(9, 5)).toBe(1)
  })
})

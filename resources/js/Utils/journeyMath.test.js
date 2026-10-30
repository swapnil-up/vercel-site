import { describe, it, expect } from 'vitest'
import {
  cameraForProgress,
  clamp,
  damp,
  facingForSpeed,
  gaitRate,
  journeyLayout,
  motionState,
  positionForCamera,
  progressForCamera,
  progressForStop,
  progressFromScroll,
  scrollTopForProgress,
  panelFocus,
  smoothstep,
  travelDirection,
} from './journeyMath.js'

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(0.5)).toBe(0.5)
    expect(clamp(-2)).toBe(0)
    expect(clamp(9)).toBe(1)
  })

  it('treats NaN as the minimum', () => {
    expect(clamp(Number.NaN)).toBe(0)
  })
})

describe('progressFromScroll', () => {
  it('reports 0 at the root top and 1 at the end', () => {
    const base = { rootTop: 100, rootHeight: 1000, viewportHeight: 200 }

    expect(progressFromScroll({ ...base, scrollY: 100 })).toBe(0)
    expect(progressFromScroll({ ...base, scrollY: 900 })).toBe(1)
  })

  it('clamps before and after the root', () => {
    const base = { rootTop: 100, rootHeight: 1000, viewportHeight: 200 }

    expect(progressFromScroll({ ...base, scrollY: 0 })).toBe(0)
    expect(progressFromScroll({ ...base, scrollY: 4000 })).toBe(1)
  })

  it('never divides by zero when the root is not scrollable', () => {
    const progress = progressFromScroll({
      scrollY: 50,
      rootTop: 0,
      rootHeight: 200,
      viewportHeight: 200,
    })

    expect(progress).toBe(0)
  })
})

describe('scrollTopForProgress', () => {
  it('round-trips through progressFromScroll', () => {
    const root = { rootTop: 40, rootHeight: 2000, viewportHeight: 500 }

    const top = scrollTopForProgress(0.7, root.rootTop, root.rootHeight, root.viewportHeight)
    const progress = progressFromScroll({ ...root, scrollY: top })

    expect(progress).toBeCloseTo(0.7, 6)
  })

  it('clamps out-of-range progress', () => {
    expect(scrollTopForProgress(9, 0, 2000, 500)).toBe(1500)
    expect(scrollTopForProgress(-9, 0, 2000, 500)).toBe(0)
  })
})

describe('journeyLayout', () => {
  const stops = [
    { id: 'a', span: 1.5, gap: 0.5 },
    { id: 'b', span: 1, gap: 0.25 },
    { id: 'c', span: 2, gap: 0.5 },
  ]

  it('lays stops end to end with gaps', () => {
    const layout = journeyLayout(stops, 1)
    expect(layout.items.map((item) => item.x0)).toEqual([0, 2, 3.25])
    expect(layout.items.map((item) => item.center)).toEqual([0.75, 2.5, 4.25])
    expect(layout.worldWidth).toBe(5.75)
  })

  it('centres each stop in the viewport', () => {
    const layout = journeyLayout(stops, 1)
    expect(layout.anchors[0]).toBeCloseTo(0.25)
    expect(layout.anchors[1]).toBeCloseTo(2)
    expect(layout.anchors[2]).toBeCloseTo(3.75)
    expect(layout.camStart).toBeCloseTo(0.25)
    expect(layout.camEnd).toBeCloseTo(3.75)
  })

  it('clamps anchors to the world edges', () => {
    const layout = journeyLayout(
      [
        { id: 'a', span: 1, gap: 0 },
        { id: 'b', span: 1, gap: 0 },
      ],
      1,
    )
    expect(layout.camMax).toBeCloseTo(1)
    expect(layout.anchors).toEqual([0, 1])
  })

  it('falls back to sensible spans for missing pacing', () => {
    const layout = journeyLayout([{ id: 'a' }, { id: 'b' }])
    expect(layout.items[0].span).toBe(1.4)
    expect(layout.items[0].gap).toBe(0)
  })
  it('lays a continuous street out one viewport per place', () => {
    const places = Array.from({ length: 8 }, (_, index) => ({
      id: `place-${index}`,
      span: 1,
      gap: 0,
    }))
    const layout = journeyLayout(places, 1)

    expect(layout.worldWidth).toBe(8)
    expect(layout.anchors).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(layout.camStart).toBe(0)
    expect(layout.camEnd).toBe(7)
  })

})

describe('camera mapping', () => {
  const layout = journeyLayout(
    [
      { id: 'a', span: 1.5, gap: 0.5 },
      { id: 'b', span: 1.5, gap: 0.5 },
      { id: 'c', span: 1.5, gap: 0.5 },
    ],
    1,
  )

  it('maps progress onto the camera range and back', () => {
    expect(cameraForProgress(0, layout)).toBeCloseTo(layout.camStart)
    expect(cameraForProgress(1, layout)).toBeCloseTo(layout.camEnd)
    expect(progressForCamera(cameraForProgress(0.4, layout), layout)).toBeCloseTo(0.4, 6)
  })

  it('holds the first and last stops at the ends of the scroll', () => {
    expect(progressForStop(0, layout)).toBeCloseTo(0)
    expect(progressForStop(2, layout)).toBeCloseTo(1)
  })

  it('interpolates a fractional stop position between anchors', () => {
    const middle = (layout.anchors[0] + layout.anchors[1]) / 2
    expect(positionForCamera(middle, layout)).toBeCloseTo(0.5)
    expect(positionForCamera(-100, layout)).toBeCloseTo(0)
    expect(positionForCamera(999, layout)).toBeCloseTo(2)
  })

  it('snaps to whole stops at each anchor', () => {
    layout.anchors.forEach((anchor, index) => {
      expect(positionForCamera(anchor, layout)).toBeCloseTo(index, 6)
    })
  })
})

describe('damp', () => {
  it('moves part of the way toward the target', () => {
    const next = damp(0, 100, 8, 0.016)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(100)
  })

  it('settles exactly and shrinks the remaining gap', () => {
    let value = 0
    for (let i = 0; i < 400; i++) {
      value = damp(value, 50, 8, 0.016)
    }
    expect(value).toBeCloseTo(50, 3)

    const near = damp(49.9, 50, 8, 0.016)
    expect(50 - near).toBeLessThan(50 - 49.9)
  })

  it('is frame-rate independent', () => {
    const oneStep = damp(0, 100, 6, 0.032)
    const twoSteps = damp(damp(0, 100, 6, 0.016), 100, 6, 0.016)
    expect(oneStep).toBeCloseTo(twoSteps, 6)
  })

  it('ignores non-positive dt', () => {
    expect(damp(10, 90, 8, 0)).toBe(10)
  })
})

describe('travelDirection', () => {
  it('reports the direction between stops', () => {
    expect(travelDirection(1, 3)).toBe('forward')
    expect(travelDirection(3, 1)).toBe('back')
    expect(travelDirection(2, 2)).toBe('idle')
  })
})

describe('gaitRate', () => {
  it('plays at 1x for the reference travel speed', () => {
    expect(gaitRate(0.45)).toBeCloseTo(1)
  })

  it('clamps slow and very fast travel', () => {
    expect(gaitRate(0)).toBeCloseTo(0.2)
    expect(gaitRate(0.01)).toBeCloseTo(0.2)
    expect(gaitRate(99)).toBeCloseTo(2.6)
  })

  it('scales the cadence with speed', () => {
    expect(gaitRate(0.9)).toBeCloseTo(2)
    expect(gaitRate(0.225)).toBeCloseTo(0.5)
  })
})

describe('motionState', () => {
  it('needs a higher speed to start walking than to keep walking', () => {
    expect(motionState(0.05).moving).toBe(false)
    expect(motionState(0.09).moving).toBe(true)
    expect(motionState(0.05, { moving: true }).moving).toBe(true)
    expect(motionState(0.02, { moving: true }).moving).toBe(false)
  })

  it('needs a higher speed to start running than to keep running', () => {
    expect(motionState(1.2, { moving: true }).running).toBe(false)
    expect(motionState(1.5, { moving: true }).running).toBe(true)
    expect(motionState(1.0, { moving: true, running: true }).running).toBe(true)
    expect(motionState(0.8, { moving: true, running: true }).running).toBe(false)
  })

  it('can enter walk and run directly from rest', () => {
    expect(motionState(9)).toEqual({ moving: true, running: true })
  })
})

describe('facingForSpeed', () => {
  it('flips only once travel is clearly directional', () => {
    expect(facingForSpeed(0.03, 'left')).toBe('right')
    expect(facingForSpeed(-0.03, 'right')).toBe('left')
  })

  it('holds the current facing when nearly still', () => {
    expect(facingForSpeed(0.01, 'left')).toBe('left')
    expect(facingForSpeed(-0.01, 'right')).toBe('right')
  })
})

describe('panelFocus', () => {
  it('is full at the place anchor and gone halfway to a neighbour', () => {
    expect(panelFocus(2, 2)).toBe(1)
    expect(panelFocus(2.5, 2)).toBe(0)
    expect(panelFocus(1.5, 2)).toBe(0)
  })

  it('fades continuously between the hold and midpoint', () => {
    const leaving = panelFocus(2.34, 2)
    const arriving = panelFocus(1.66, 2)

    expect(leaving).toBeGreaterThan(0)
    expect(leaving).toBeLessThan(1)
    expect(arriving).toBeCloseTo(leaving, 6)
  })

  it('keeps distant places hidden', () => {
    expect(panelFocus(0, 4)).toBe(0)
    expect(panelFocus(7, 0)).toBe(0)
  })
})

describe('smoothstep', () => {
  it('eases between the edges and clamps outside them', () => {
    expect(smoothstep(0, 1, 0)).toBe(0)
    expect(smoothstep(0, 1, 1)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
  })
})

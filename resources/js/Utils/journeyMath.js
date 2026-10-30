export function clamp(value, min = 0, max = 1) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/**
 * Map a scroll position inside the journey root to 0..1 progress.
 */
export function progressFromScroll({ scrollY, rootTop, rootHeight, viewportHeight }) {
  const range = rootHeight - viewportHeight

  if (range <= 0) return 0

  return clamp((scrollY - rootTop) / range)
}

/**
 * Scroll offset inside the root for a 0..1 progress value.
 */
export function scrollTopForProgress(progress, rootTop, rootHeight, viewportHeight) {
  const range = Math.max(rootHeight - viewportHeight, 0)

  return rootTop + clamp(progress) * range
}

/**
 * Lay out stops as physical objects along a horizontally panned world.
 *
 * `span` is the stop's width in viewport widths (1 = 100vw) and `gap` is the
 * empty walking distance after it. `x0` is measured from the world's left
 * edge in the same units, and `anchors` hold the camera offset (vw) that
 * centres each stop in the viewport.
 */
export function journeyLayout(stops, viewport = 1) {
  const items = []
  let cursor = 0

  for (let index = 0; index < stops.length; index++) {
    const stop = stops[index]
    const span = Math.max(Number(stop.span) || 1.4, 0.6)
    const gap = Math.max(Number(stop.gap) || 0, 0)

    items.push({
      index,
      id: stop.id,
      span,
      gap,
      x0: cursor,
      center: cursor + span / 2,
    })

    cursor += span + gap
  }

  const worldWidth = Math.max(cursor, viewport)
  const camMax = Math.max(worldWidth - viewport, 0)
  const anchors = items.map((item) => clamp(item.center - viewport / 2, 0, camMax))
  const camStart = anchors[0] ?? 0
  const camEnd = anchors[anchors.length - 1] ?? camStart

  return { items, worldWidth, camMax, anchors, camStart, camEnd }
}

/**
 * Camera offset (vw) for 0..1 journey progress.
 */
export function cameraForProgress(progress, layout) {
  return layout.camStart + clamp(progress) * (layout.camEnd - layout.camStart)
}

/**
 * Normalised 0..1 journey progress for a camera offset (vw).
 */
export function progressForCamera(camera, layout) {
  const range = layout.camEnd - layout.camStart

  if (range <= 0) return 0

  return clamp((camera - layout.camStart) / range)
}

/**
 * Fractional stop position for a camera offset, interpolated between anchors.
 * Stop 2 is at rest when this returns exactly 2.
 */
export function positionForCamera(camera, layout) {
  const { anchors } = layout

  if (anchors.length <= 1) return 0

  const clamped = clamp(camera, anchors[0], anchors[anchors.length - 1])
  let segment = 0

  while (segment < anchors.length - 2 && clamped >= anchors[segment + 1]) {
    segment++
  }

  const from = anchors[segment]
  const to = anchors[segment + 1]
  const t = to > from ? clamp((clamped - from) / (to - from)) : 0

  return segment + t
}

/**
 * Progress that lands the camera on a stop's anchor.
 */
export function progressForStop(index, layout) {
  const last = Math.max(layout.anchors.length - 1, 0)
  const anchor = layout.anchors[Math.round(clamp(index, 0, last))] ?? 0

  return progressForCamera(anchor, layout)
}

/**
 * Critically damped follow used by the camera. `lambda` controls stiffness;
 * larger values settle faster. Frame-rate independent.
 */
export function damp(current, target, lambda, dt) {
  if (!(dt > 0)) return current

  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

/**
 * Direction of travel between two stop indices.
 */
export function travelDirection(previous, next) {
  if (next > previous) return 'forward'
  if (next < previous) return 'back'
  return 'idle'
}

/**
 * Gait playback speed for a camera velocity in viewport widths per second.
 * At the reference speed the base CSS animations play at 1x, matching Yakku's
 * `speed / 300` cadence. Slow and fast travel are clamped so the legs never
 * stall or turn into a blur.
 */
export const GAIT_REFERENCE = 0.45
export const GAIT_MIN = 0.2
export const GAIT_MAX = 2.6

export function gaitRate(speed, reference = GAIT_REFERENCE) {
  if (!(speed > 0)) return GAIT_MIN
  if (!(reference > 0)) return 1

  return clamp(speed / reference, GAIT_MIN, GAIT_MAX)
}

/**
 * Hysteresis for walk/run states, using smoothed camera speed (vw/s).
 * Entering and leaving use different thresholds so bursty wheel/trackpad input
 * does not flip the pose every frame.
 */
export const MOTION_THRESHOLDS = {
  walkEnter: 0.08,
  walkLeave: 0.03,
  runEnter: 1.4,
  runLeave: 0.9,
}

export function motionState(speed, { moving = false, running = false } = {}) {
  const thresholds = MOTION_THRESHOLDS
  const isMoving = moving ? speed > thresholds.walkLeave : speed > thresholds.walkEnter
  const isRunning = isMoving && (running ? speed > thresholds.runLeave : speed > thresholds.runEnter)

  return { moving: isMoving, running: isRunning }
}

/**
 * Keep the current facing until travel is clearly in one direction.
 */
export function facingForSpeed(velocity, current = 'right', threshold = 0.02) {
  if (velocity > threshold) return 'right'
  if (velocity < -threshold) return 'left'

  return current
}

/**
 * Classic smoothstep: eases 0..1 as value crosses edge0..edge1.
 */
export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1

  const t = clamp((value - edge0) / (edge1 - edge0))

  return t * t * (3 - 2 * t)
}

/**
 * How present a place's paper should be at a fractional camera position.
 * Full at the anchor, fading toward zero halfway to either neighbour, so
 * consecutive papers pass each other instead of popping on/off.
 */
export function panelFocus(position, index, { start = 0.2, end = 0.48 } = {}) {
  const distance = Math.abs(position - index)

  return 1 - smoothstep(start, end, distance)
}

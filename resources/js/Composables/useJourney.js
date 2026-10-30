import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  cameraForProgress,
  clamp,
  damp,
  facingForSpeed,
  motionState,
  positionForCamera,
  progressForCamera,
  progressForStop,
  progressFromScroll,
  scrollTopForProgress,
  travelDirection,
} from '@/Utils/journeyMath'

/**
 * Scroll engine for the Dulna Jaam homepage.
 *
 * Scroll sets a target camera offset in the world. A damped follow (rAF until
 * settled) moves the camera there, giving the walk its weight and velocity.
 * The fractional stop position, active stop and dog gait all read from that
 * damped camera rather than raw scroll. Smoothed speed feeds walk/run
 * hysteresis; facing only updates while the camera is actually travelling.
 */
export function useJourney({ rootRef, layout, enabled }) {
  const camera = ref(layout.value.camStart)
  const progress = ref(0)
  const velocity = ref(0)
  const speed = ref(0)
  const moving = ref(false)
  const running = ref(false)
  const facing = ref('right')
  const direction = ref('idle')

  const position = computed(() => positionForCamera(camera.value, layout.value))
  const activeIndex = computed(() => Math.round(position.value))

  let targetCamera = layout.value.camStart
  let smoothedSpeed = 0
  let frame = 0
  let lastTime = 0
  let attached = false

  const count = () => layout.value.items.length || 1

  const applyCamera = (value) => {
    camera.value = value
    progress.value = progressForCamera(value, layout.value)
  }

  const readTarget = () => {
    const root = rootRef.value
    if (!root) return

    const rect = root.getBoundingClientRect()
    const rootTop = rect.top + window.scrollY

    const raw = progressFromScroll({
      scrollY: window.scrollY,
      rootTop,
      rootHeight: rect.height,
      viewportHeight: window.innerHeight,
    })

    targetCamera = cameraForProgress(raw, layout.value)
  }

  const tick = (now) => {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016
    lastTime = now

    const previous = camera.value
    const next = damp(previous, targetCamera, 8, dt)
    const settled = Math.abs(targetCamera - next) < 0.08

    applyCamera(settled ? targetCamera : next)

    const rawVelocity = settled ? 0 : (camera.value - previous) / Math.max(dt, 1 / 240)

    smoothedSpeed += (Math.abs(rawVelocity) - smoothedSpeed) * (1 - Math.exp(-9 * dt))

    const state = motionState(smoothedSpeed, {
      moving: moving.value,
      running: running.value,
    })

    moving.value = state.moving
    running.value = state.running
    facing.value = facingForSpeed(rawVelocity, facing.value)
    speed.value = smoothedSpeed
    velocity.value = clamp(smoothedSpeed / 2)

    if (settled && !state.moving) {
      speed.value = 0
      velocity.value = 0
      smoothedSpeed = 0
      frame = 0
      lastTime = 0
      return
    }

    frame = requestAnimationFrame(tick)
  }

  const ensureLoop = () => {
    if (frame) return
    lastTime = 0
    frame = requestAnimationFrame(tick)
  }

  const schedule = () => {
    readTarget()
    ensureLoop()
  }

  const read = ({ snap = false } = {}) => {
    readTarget()
    if (snap) {
      applyCamera(targetCamera)
      smoothedSpeed = 0
      speed.value = 0
      velocity.value = 0
      moving.value = false
      running.value = false
    }
    ensureLoop()
  }

  const goTo = (index, { smooth = true } = {}) => {
    const root = rootRef.value
    if (!root) return

    const target = Math.round(clamp(index, 0, count() - 1))
    const rect = root.getBoundingClientRect()

    const top = scrollTopForProgress(
      progressForStop(target, layout.value),
      rect.top + window.scrollY,
      rect.height,
      window.innerHeight,
    )

    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  }

  const next = () => goTo(activeIndex.value + 1)
  const prev = () => goTo(activeIndex.value - 1)

  let touchStart = null
  const onTouchStart = (event) => {
    if (event.touches.length !== 1 || isTextEntry(event.target)) {
      touchStart = null
      return
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  const onTouchEnd = (event) => {
    if (!touchStart) return
    const point = event.changedTouches[0]
    const dx = point.clientX - touchStart.x
    const dy = point.clientY - touchStart.y
    touchStart = null

    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    if (dx < 0) next()
    else prev()
  }

  const onTouchCancel = () => {
    touchStart = null
  }

  const isTextEntry = (target) =>
    target instanceof HTMLElement &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)

  const isClickable = (target) =>
    target instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName)

  const onKeydown = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
    if (isTextEntry(event.target)) return
    if (event.key === ' ' && isClickable(event.target)) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault()
        next()
        break
      case ' ':
        event.preventDefault()
        if (event.shiftKey) prev()
        else next()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault()
        prev()
        break
      case 'Home':
        event.preventDefault()
        goTo(0)
        break
      case 'End':
        event.preventDefault()
        goTo(count() - 1)
        break
    }
  }

  const attach = () => {
    if (attached) return
    attached = true
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchCancel, { passive: true })
    read({ snap: true })
  }

  const detach = () => {
    if (!attached) return
    attached = false
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchCancel)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
  }

  watch(activeIndex, (nextIndex, previousIndex) => {
    direction.value = travelDirection(previousIndex, nextIndex)
  })

  watch(enabled, (on) => {
    if (on) attach()
    else detach()
  })

  onMounted(() => {
    if (enabled.value) attach()
  })

  onBeforeUnmount(detach)

  return {
    progress,
    camera,
    velocity,
    speed,
    moving,
    running,
    facing,
    position,
    activeIndex,
    direction,
    goTo,
    next,
    prev,
    read,
  }
}

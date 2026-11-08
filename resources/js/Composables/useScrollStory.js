import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import 'lenis/dist/lenis.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { chapterFromProgress, progressForChapter } from '@/Utils/chapterProgress'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll engine for the homepage chapter walk.
 *
 * A single ScrollTrigger pins the hero and reports a 0..1 progress plus the
 * active chapter. Lenis is driven by GSAP's ticker so there is exactly one rAF
 * loop. Everything is scoped to the hero and torn down on unmount, so smooth
 * scroll never leaks onto the rest of the site.
 *
 * `enabled` is false for `?static=1` and for reduced-motion users: no Lenis, no
 * pin, no scroll hijacking — the hero just sits in normal flow.
 */
export function useScrollStory({ heroRef, count, enabled }) {
  const activeIndex = ref(0)
  const progress = ref(0)
  const pinned = ref(false)

  const trigger = shallowRef(null)
  let lenis = null
  let context = null
  let tick = null

  const steps = () => Math.max(count.value - 1, 1)

  const goTo = (index) => {
    const st = trigger.value
    const total = steps()
    const target = Math.min(Math.max(Math.round(index), 0), total)

    let top = null
    if (st) {
      top = st.start + (st.end - st.start) * progressForChapter(target, count.value)
    } else {
      const el = heroRef.value
      if (el) top = el.getBoundingClientRect().top + window.scrollY
    }
    if (top == null) return

    if (lenis) lenis.scrollTo(top + 1)
    else window.scrollTo({ top, behavior: 'smooth' })
  }

  const next = () => goTo(activeIndex.value + 1)
  const prev = () => goTo(activeIndex.value - 1)

  const isTextEntry = (el) =>
    el instanceof HTMLElement &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)

  const isClickable = (el) =>
    el instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)

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
        goTo(count.value - 1)
        break
    }
  }

  onMounted(() => {
    if (!enabled.value) return

    const hero = heroRef.value
    if (!hero) return

    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      autoRaf: false, // GSAP's ticker drives Lenis — one rAF loop, no drift
      anchors: true, // let #home-content and chapter jumps stay in sync
    })
    lenis.on('scroll', ScrollTrigger.update)
    tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    context = gsap.context(() => {
      const instance = ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: () => `+=${window.innerHeight * steps()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress.value = self.progress
          const index = chapterFromProgress(self.progress, count.value)
          if (index !== activeIndex.value) activeIndex.value = index
        },
        onToggle: (self) => {
          pinned.value = self.isActive
        },
      })
      trigger.value = instance
    }, hero)

    window.addEventListener('keydown', onKeydown)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    if (tick) gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
    context?.revert()
    context = null
    trigger.value = null
  })

  return { activeIndex, progress, pinned, goTo, next, prev }
}

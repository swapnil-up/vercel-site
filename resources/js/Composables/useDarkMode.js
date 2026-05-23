import { ref, watch, onMounted } from 'vue'

const isDark = ref(false)

export function useDarkMode() {
  const apply = (dark) => {
    isDark.value = dark
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }

  const toggle = () => apply(!isDark.value)

  onMounted(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      apply(true)
    } else if (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      apply(true)
    } else {
      apply(false)
    }
  })

  return { isDark, toggle }
}

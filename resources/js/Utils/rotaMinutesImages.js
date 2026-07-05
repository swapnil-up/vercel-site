const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export function getMaxImageSize() {
  return MAX_IMAGE_SIZE
}

export function checkImageSize(file) {
  if (!file) return ''
  if (file.size > MAX_IMAGE_SIZE) {
    return `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB (limit: 2MB). Consider resizing.`
  }
  return ''
}

export function readImageAsJpeg(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.src = e.target?.result ?? ''
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function convertImageToJpeg(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/png')) return Promise.resolve(dataUrl)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function convertFormImages(formData) {
  formData.letterhead_data = await convertImageToJpeg(formData.letterhead_data)
  formData.sig_left_data = await convertImageToJpeg(formData.sig_left_data)
  formData.sig_right_data = await convertImageToJpeg(formData.sig_right_data)
  formData.stamp_data = await convertImageToJpeg(formData.stamp_data)
}

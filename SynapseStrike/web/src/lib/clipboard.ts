import { notify } from './notify'

/**
 * copytext to clipboard，andshowlightweighthint。
 */
export async function copyWithToast(text: string, successMsg = 'alreadycopy') {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // fallback compatibility：createtempwhentextarea execlinecopy
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    notify.success(successMsg)
    return true
  } catch (err) {
    console.error('Clipboard copy failed:', err)
    notify.error('copyfailed')
    return false
  }
}

export default { copyWithToast }

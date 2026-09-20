import { state, mapConfigs, boundsX, boundsY } from './state.js'

export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function convertRange(value, r1, r2) {
  return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0]
}

export function toLatLng(x, y) {
  const cfg = mapConfigs[state.activeMap]
  return [
    convertRange(y, cfg.rangeY, boundsY),
    convertRange(x, cfg.rangeX, boundsX)
  ]
}

export function fromLatLng(lat, lng) {
  const cfg = mapConfigs[state.activeMap]
  return {
    x: Math.round(convertRange(lng, boundsX, cfg.rangeX)),
    y: Math.round(convertRange(lat, boundsY, cfg.rangeY))
  }
}

export function isOnActiveMap(x) {
  if (x === null || x === undefined) return false
  const cfg = mapConfigs[state.activeMap]
  if (cfg.xMax !== undefined && x >= cfg.xMax) return false
  if (cfg.xMin !== undefined && x < cfg.xMin) return false
  return true
}

export function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min. ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h. ago`
  return `${Math.floor(hours / 24)} d. ago`
}

export function fallbackCopy(text) {
  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  try {
    document.execCommand('copy')
    const ph = window.language?.phrases || {}
    toastr.success(ph['ui.teleport_copied'] || 'Teleport command copied!')
  } catch (e) {
    toastr.error('Failed to copy teleport command')
  }
  input.remove()
}

export function copyTeleport(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const ph = window.language?.phrases || {}
      toastr.success(ph['ui.teleport_copied'] || 'Teleport command copied!')
    }).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

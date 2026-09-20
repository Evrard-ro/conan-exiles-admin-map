/**
 * Ruler / Distance Measurement Tool for Conan Exiles Admin Map
 * Accurately measures in meters (100 UU = 1m) and foundations (256 UU = 1 block).
 */
import { state } from './state.js'
import { fromLatLng, escapeHtml } from './utils.js'

let rulerPoints = []
let rulerMarkers = []
let rulerLabels = []
let rulerLine = null
let previewLine = null

export function calculateDistance(p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const uu = Math.sqrt(dx * dx + dy * dy)
  const meters = uu / 100
  const foundations = uu / 256
  return { uu, meters, foundations }
}

export function formatDistance(dist) {
  const m = dist.meters >= 1000
    ? `${(dist.meters / 1000).toFixed(2)} km (${dist.meters.toFixed(1)} m)`
    : `${dist.meters.toFixed(1)} m`
  const f = `${dist.foundations.toFixed(1)} foundations`
  const u = `${Math.round(dist.uu).toLocaleString()} UU`
  return { m, f, u }
}

function updateHud(totalDist, currentSegment) {
  const $hud = $('#ruler-hud')
  if (!$hud.length) return

  if (rulerPoints.length === 0) {
    $hud.html(
      `<div class="ruler-hud-title">📏 Measure Tool</div>` +
      `<div class="ruler-hud-sub">Click anywhere on the map to start measuring</div>` +
      `<button class="ruler-hud-close" onclick="window.toggleRuler(false)">✕</button>`
    )
    return
  }

  const fmtTotal = formatDistance(totalDist || { meters: 0, foundations: 0, uu: 0 })
  let segHtml = ''
  if (currentSegment) {
    const fmtSeg = formatDistance(currentSegment)
    segHtml = `<span class="ruler-hud-seg">+ Current: <strong>${fmtSeg.m}</strong> (${fmtSeg.f})</span>`
  }

  $hud.html(
    `<div class="ruler-hud-title">📏 Distance: <strong>${fmtTotal.m}</strong> <span class="ruler-hud-f">(${fmtTotal.f})</span></div>` +
    `<div class="ruler-hud-sub">${segHtml} <span class="ruler-hud-uu">${fmtTotal.u}</span> • Points: ${rulerPoints.length}</div>` +
    `<div class="ruler-hud-actions">` +
      `<button class="ruler-hud-btn" onclick="window.clearRuler()">Clear</button>` +
      `<button class="ruler-hud-close" onclick="window.toggleRuler(false)">✕</button>` +
    `</div>`
  )
}

export function clearRuler() {
  if (!state.map) return

  rulerMarkers.forEach(m => state.map.removeLayer(m))
  rulerMarkers = []

  rulerLabels.forEach(l => state.map.removeLayer(l))
  rulerLabels = []

  if (rulerLine) {
    state.map.removeLayer(rulerLine)
    rulerLine = null
  }
  if (previewLine) {
    state.map.removeLayer(previewLine)
    previewLine = null
  }

  rulerPoints = []
  updateHud({ meters: 0, foundations: 0, uu: 0 }, null)
}

export function toggleRuler(force) {
  state.rulerActive = force !== undefined ? force : !state.rulerActive

  $('#btn-ruler').toggleClass('active', state.rulerActive)
  $('#map').toggleClass('ruler-cursor', state.rulerActive)

  if (state.rulerActive) {
    $('#ruler-hud').show()
    clearRuler()
  } else {
    $('#ruler-hud').hide()
    clearRuler()
  }
}

export function onRulerMapClick(e) {
  if (!state.rulerActive || !state.map) return

  const coords = fromLatLng(e.latlng.lat, e.latlng.lng)
  const newPoint = { latlng: e.latlng, x: coords.x, y: coords.y }

  // Draw vertex circle
  const marker = L.circleMarker(e.latlng, {
    radius: 5,
    color: '#c8860a',
    fillColor: '#ffffff',
    fillOpacity: 1,
    weight: 2
  }).addTo(state.map)
  rulerMarkers.push(marker)

  if (rulerPoints.length > 0) {
    const prevPoint = rulerPoints[rulerPoints.length - 1]
    const segment = calculateDistance(prevPoint, newPoint)

    // Segment midpoint for label
    const midLat = (prevPoint.latlng.lat + newPoint.latlng.lat) / 2
    const midLng = (prevPoint.latlng.lng + newPoint.latlng.lng) / 2
    const fmt = formatDistance(segment)

    const labelIcon = L.divIcon({
      className: 'ruler-segment-label',
      html: `<span>${fmt.m}</span>`,
      iconSize: [80, 20],
      iconAnchor: [40, 10]
    })
    const distLabel = L.marker([midLat, midLng], { icon: labelIcon, interactive: false }).addTo(state.map)
    rulerLabels.push(distLabel)
  }

  rulerPoints.push(newPoint)

  // Update fixed line
  const latlngs = rulerPoints.map(p => p.latlng)
  if (!rulerLine) {
    rulerLine = L.polyline(latlngs, { color: '#c8860a', weight: 3, opacity: 0.9 }).addTo(state.map)
  } else {
    rulerLine.setLatLngs(latlngs)
  }

  // Calculate total distance so far
  let totalUu = 0
  for (let i = 1; i < rulerPoints.length; i++) {
    totalUu += calculateDistance(rulerPoints[i - 1], rulerPoints[i]).uu
  }
  const total = { uu: totalUu, meters: totalUu / 100, foundations: totalUu / 256 }
  updateHud(total, null)
}

export function onRulerMouseMove(e) {
  if (!state.rulerActive || !state.map || rulerPoints.length === 0) return

  const coords = fromLatLng(e.latlng.lat, e.latlng.lng)
  const currentPoint = { latlng: e.latlng, x: coords.x, y: coords.y }
  const lastPoint = rulerPoints[rulerPoints.length - 1]

  const segDist = calculateDistance(lastPoint, currentPoint)

  // Live preview dashed line
  if (!previewLine) {
    previewLine = L.polyline([lastPoint.latlng, e.latlng], {
      color: '#c8860a',
      weight: 2,
      dashArray: '5, 5',
      opacity: 0.75
    }).addTo(state.map)
  } else {
    previewLine.setLatLngs([lastPoint.latlng, e.latlng])
  }

  // Calculate total with current live segment
  let totalUu = 0
  for (let i = 1; i < rulerPoints.length; i++) {
    totalUu += calculateDistance(rulerPoints[i - 1], rulerPoints[i]).uu
  }
  totalUu += segDist.uu
  const total = { uu: totalUu, meters: totalUu / 100, foundations: totalUu / 256 }
  updateHud(total, segDist)
}

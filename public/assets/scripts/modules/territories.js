/**
 * Clan territory polygon visualization using 2D Convex Hull
 */
import { state, colorhash } from './state.js'
import { toLatLng, isOnActiveMap, escapeHtml } from './utils.js'

function crossProduct(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

export function computeConvexHull(points) {
  if (points.length <= 2) return points

  const pts = points.slice().sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))
  const unique = []
  for (let i = 0; i < pts.length; i++) {
    if (i === 0 || pts[i][0] !== pts[i - 1][0] || pts[i][1] !== pts[i - 1][1]) {
      unique.push(pts[i])
    }
  }
  if (unique.length <= 2) return unique

  const lower = []
  for (let i = 0; i < unique.length; i++) {
    const p = unique[i]
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper = []
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i]
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export function calculateAreaM2(hull) {
  if (!hull || hull.length < 3) return 0
  let areaUU = 0
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length
    areaUU += hull[i][0] * hull[j][1] - hull[j][0] * hull[i][1]
  }
  // 1 meter = 100 Unreal Units, so 1 m^2 = 10,000 UU^2
  return Math.abs(areaUU) / 20000
}

export function updateTerritories() {
  if (!state.map) return

  if (!state.territoryGroup) {
    state.territoryGroup = L.layerGroup()
  }
  state.territoryGroup.clearLayers()

  if (!state.territoriesEnabled) {
    if (state.map.hasLayer(state.territoryGroup)) {
      state.map.removeLayer(state.territoryGroup)
    }
    return
  }

  // Group markers by clan / guild
  const clanPoints = {}
  state.allMarkersData.forEach(item => {
    if (!isOnActiveMap(item.x)) return
    const clanId = item.guild_id || item.owner || item.char_id
    if (!clanId) return

    if (!state.groupNames[clanId]) {
      if (item.guild_name) state.groupNames[clanId] = item.guild_name
      else if (item.char_name) state.groupNames[clanId] = item.char_name
    }

    if (!clanPoints[clanId]) {
      clanPoints[clanId] = []
    }
    clanPoints[clanId].push([parseFloat(item.x), parseFloat(item.y)])
  })

  const ph = window.language?.phrases || {}
  const areaLabel = ph['ui.area'] || 'Area'
  const markersLabel = ph['ui.markers'] || 'Markers'

  Object.keys(clanPoints).forEach(clanId => {
    // If a specific clan filter is active, only draw that clan's territory
    if (state.clanFilter !== 'all' && state.clanFilter !== String(clanId)) {
      return
    }

    const points = clanPoints[clanId]
    if (!points || points.length === 0) return

    const clanName = state.groupNames[clanId] || String(clanId)
    const color = state.groupColors[clanId] || colorhash.hex(clanId + clanName) || '#c8860a'
    if (!state.groupColors[clanId]) state.groupColors[clanId] = color

    if (points.length >= 3) {
      const hull = computeConvexHull(points)
      if (hull.length >= 3) {
        const latlngs = hull.map(pt => toLatLng(pt[0], pt[1]))
        const areaM2 = calculateAreaM2(hull)
        const areaStr = areaM2 >= 10000
          ? `${(areaM2 / 10000).toFixed(2)} ha (${Math.round(areaM2).toLocaleString()} m²)`
          : `${Math.round(areaM2).toLocaleString()} m²`

        const poly = L.polygon(latlngs, {
          color: color,
          fillColor: color,
          fillOpacity: 0.16,
          weight: 2,
          dashArray: '6, 6'
        })

        const tooltipContent =
          `<div class="tip-header"><span class="clan-dot" style="background:${escapeHtml(color)}"></span> ${escapeHtml(clanName)}</div>` +
          `<div class="tip-row"><span class="tip-lbl">${escapeHtml(areaLabel)}:</span> <span class="tip-val">${escapeHtml(areaStr)}</span></div>` +
          `<div class="tip-row"><span class="tip-lbl">${escapeHtml(markersLabel)}:</span> <span class="tip-val">${points.length}</span></div>`

        poly.bindTooltip(tooltipContent, { direction: 'center', opacity: 0.95 })
        poly.addTo(state.territoryGroup)
      }
    } else if (points.length === 2) {
      const line = L.polyline(
        [toLatLng(points[0][0], points[0][1]), toLatLng(points[1][0], points[1][1])],
        { color: color, weight: 4, dashArray: '6, 6', opacity: 0.7 }
      )
      line.bindTooltip(`<div class="tip-header">${escapeHtml(clanName)}</div>`, { direction: 'top' })
      line.addTo(state.territoryGroup)
    } else if (points.length === 1) {
      const marker = L.circleMarker(toLatLng(points[0][0], points[0][1]), {
        radius: 18,
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4'
      })
      marker.bindTooltip(`<div class="tip-header">${escapeHtml(clanName)}</div>`, { direction: 'top' })
      marker.addTo(state.territoryGroup)
    }
  })

  if (!state.map.hasLayer(state.territoryGroup)) {
    state.map.addLayer(state.territoryGroup)
  }
}

export function toggleTerritories(force) {
  state.territoriesEnabled = force !== undefined ? force : !state.territoriesEnabled

  $('#btn-territories').toggleClass('active', state.territoriesEnabled)
  $('#territories-toggle').prop('checked', state.territoriesEnabled)

  updateTerritories()

  const ph = window.language?.phrases || {}
  const clanTerritoriesLabel = ph['ui.clan_territories'] || 'Clan territories'
  const msg = state.territoriesEnabled
    ? `${clanTerritoriesLabel}: ON`
    : `${clanTerritoriesLabel}: OFF`
  if (window.toastr) {
    window.toastr.info(msg)
  }
}

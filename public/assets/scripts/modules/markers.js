import { state, circleMarkerOptions, tooltipOptions, colorhash } from './state.js'
import { toLatLng, isOnActiveMap, copyTeleport } from './utils.js'
import { getTooltipContent, makeClusterIcon, clusterTooltipHtml, getOwnerById } from './tooltips.js'
import { applyClanFilter, rebuildClanFilterMenu } from './panels.js'

export function clearAllLayers() {
  state.markerByCoords = {}

  Object.keys(state.markerLayers).forEach(k => {
    if (state.map && state.map.hasLayer(state.markerLayers[k])) {
      state.map.removeLayer(state.markerLayers[k])
    }
    state.markerLayers[k].clearLayers()
  })
  state.markerLayers = {}

  Object.keys(state.clusterGroups).forEach(k => {
    if (state.map && state.map.hasLayer(state.clusterGroups[k])) {
      state.map.removeLayer(state.clusterGroups[k])
    }
  })
  state.clusterGroups = {}

  state.groupNames = {}
  state.groupColors = {}
}

export function isOwnerInactive(marker) {
  if (!state.inactiveDays || state.inactiveDays <= 0) return true
  let lastSeen
  if (marker.guild_id) {
    lastSeen = state.guildLastOnline[String(marker.guild_id)]
  } else if (marker.char_id) {
    lastSeen = state.playerLastOnline[String(marker.char_id)]
  } else if (marker.owner) {
    const ownerId = String(marker.owner)
    lastSeen = state.playerLastOnline[ownerId] || state.guildLastOnline[ownerId]
  }
  if (lastSeen == null) return true
  const thresholdMs = Date.now() - state.inactiveDays * 86400000
  return lastSeen <= thresholdMs
}

export function onMarkerClick(point) {
  const text = point.target.options.teleport
  copyTeleport(text)
}

export function pulseMarker(lm) {
  lm.setStyle({ color: 'white', weight: 4 })
  setTimeout(() => {
    lm.setStyle({ color: 'black', weight: 1 })
  }, 2000)
}

export function createMarker(marker, group) {
  const opt = Object.assign({}, circleMarkerOptions)
  opt.fillColor = marker.color || opt.color
  opt.color = marker.stroke || opt.stroke
  opt.teleport = `TeleportPlayer ${marker.x} ${marker.y} ${marker.z}`
  if (state.canvasRenderer) {
    opt.renderer = state.canvasRenderer
  }

  if (group && !state.markerLayers[group]) {
    state.markerLayers[group] = L.layerGroup()
  }

  const point = L.circleMarker(toLatLng(marker.x, marker.y), opt)
    .bindTooltip(marker.tooltip, tooltipOptions)
    .on('click', onMarkerClick)

  state.markerByCoords[`${marker.x},${marker.y}`] = point

  if (group) {
    point.addTo(state.markerLayers[group])
    return
  }
  point.addTo(state.map)
}

export function createMarkerInCluster(marker, clusterGroup) {
  const opt = Object.assign({}, circleMarkerOptions)
  opt.fillColor = marker.color || opt.fillColor
  opt.color = marker.stroke || 'black'
  opt.teleport = `TeleportPlayer ${marker.x} ${marker.y} ${marker.z}`
  opt.markerGuildId = marker.guild_id || null
  opt.markerGuildName = marker.guild_name || ''
  opt.markerCharId = marker.char_id || null
  opt.markerCharName = marker.char_name || ''
  if (state.canvasRenderer) {
    opt.renderer = state.canvasRenderer
  }

  const point = L.circleMarker(toLatLng(marker.x, marker.y), opt)
    .bindTooltip(marker.tooltip, tooltipOptions)
    .on('click', onMarkerClick)
    .addTo(clusterGroup)

  state.markerByCoords[`${marker.x},${marker.y}`] = point
}

export function renderMarkers(markers) {
  clearAllLayers()

  markers.forEach(marker => {
    if (!isOnActiveMap(marker.x)) return
    if (!isOwnerInactive(marker)) return

    let group = 'default'
    marker.stroke = 'black'

    if (marker.guild_name) {
      group = marker.guild_id
      marker.color = colorhash.hex(marker.guild_id + marker.guild_name)
      state.groupNames[group] = marker.guild_name
      state.groupColors[group] = marker.color
    } else if (marker.char_name) {
      group = marker.char_id
      marker.color = colorhash.hex(marker.char_id + marker.char_name)
      state.groupNames[group] = marker.char_name
      state.groupColors[group] = marker.color
    } else if (marker.owner) {
      const owner = getOwnerById(marker.owner)
      group = marker.owner
      marker.guild_name = owner
      marker.color = colorhash.hex(marker.owner + owner) || 'pink'
      state.groupNames[group] = owner || String(marker.owner)
      state.groupColors[group] = marker.color
    } else if (marker.info) {
      marker.color = 'yellow'
    }

    if (marker.online == 1) {
      marker.stroke = 'white'
    }

    marker.tooltip = getTooltipContent(marker)

    if (state.clusterEnabled) {
      if (!state.clusterGroups[group]) {
        const cgColor = marker.color || '#666'
        const cg = L.markerClusterGroup({
          iconCreateFunction: makeClusterIcon(cgColor),
          maxClusterRadius: 80,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false
        })
        cg.on('clustermouseover', e => {
          e.layer.unbindTooltip()
          e.layer.bindTooltip(clusterTooltipHtml(e.layer), {
            direction: 'top',
            sticky: true,
            opacity: 0.95
          }).openTooltip()
        })
        cg.on('clustermouseout', e => {
          e.layer.closeTooltip()
          e.layer.unbindTooltip()
        })
        state.clusterGroups[group] = cg
      }
      createMarkerInCluster(marker, state.clusterGroups[group])
    } else {
      createMarker(marker, group)
    }
  })

  if (state.clusterEnabled) {
    Object.keys(state.clusterGroups).forEach(k => {
      state.clusterGroups[k].addTo(state.map)
    })
  } else {
    Object.keys(state.markerLayers).forEach(k => {
      state.markerLayers[k].addTo(state.map)
    })
  }

  applyClanFilter()
  rebuildClanFilterMenu()
}

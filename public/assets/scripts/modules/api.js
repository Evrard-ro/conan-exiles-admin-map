import { state } from './state.js'
import { escapeHtml, timeSince, isOnActiveMap } from './utils.js'
import { renderMarkers, clearAllLayers } from './markers.js'
import { openPanel, closePanel, rebuildClanFilterMenu, showAll } from './panels.js'

export function loadServers() {
  $.getJSON('api/servers', servers => {
    if (!servers || !servers.length) {
      toastr.error('No servers available. Check your configuration.')
      return
    }
    renderServersList(servers)
    if (servers.length === 1) {
      selectServer(servers[0].id)
    } else {
      openPanel('servers')
    }
  }).fail(() => {
    toastr.error('Failed to load server list.')
  })
}

export function renderServersList(servers) {
  let html = ''
  servers.forEach(s => {
    const ago = s.timestamp ? timeSince(new Date(s.timestamp)) : 'never'
    const active = s.id === state.activeServerId ? ' server-active' : ''
    const sid = JSON.stringify(s.id).replace(/"/g, '&quot;')
    html += `<div class="server-item${active}" onclick="selectServer(${sid})">`
    html += `<span class="server-radio">${s.id === state.activeServerId ? '◉' : '○'}</span>`
    html += `<div class="server-info">`
    html += `<span class="server-name">${escapeHtml(s.name)}</span>`
    html += `<span class="server-ago">${ago}</span>`
    html += `</div>`
    const refreshing = s.refreshing ? ' disabled' : ''
    const refreshLabel = s.refreshing ? '…' : '↺'
    html += `<button class="server-refresh-btn" onclick="event.stopPropagation();refreshServer(${sid})"${refreshing}>${refreshLabel}</button>`
    html += `</div>`
  })
  $('#servers-list').html(html)
}

export function selectServer(serverId) {
  state.activeServerId = serverId
  closePanel()
  getPlayers().always(() => {
    showAll()
  })
}

export function refreshServer(serverId) {
  $.ajax({
    url: `api/${serverId}/refresh`,
    method: 'POST',
    success: () => {
      toastr.success('Server data updated')
      if (serverId === state.activeServerId) {
        getPlayers().always(() => {
          showAll()
        })
      }
      $.getJSON('api/servers', servers => {
        renderServersList(servers)
      })
    },
    error: xhr => {
      const body = xhr.responseJSON || {}
      if (xhr.status === 429) {
        const mins = Math.ceil((body.retryAfter || 0) / 60)
        toastr.warning(`Next refresh available in ${mins} min.`)
      } else if (xhr.status === 409) {
        toastr.info('Refresh already in progress.')
      } else {
        toastr.error('Refresh failed.')
      }
    }
  })
}

export function getPlayers() {
  if (!state.activeServerId) return $.Deferred().resolve().promise()
  return $.getJSON(`api/${state.activeServerId}/players`, data => {
    state.playersData = data.data || []
    state.playerLastOnline = {}
    state.guildLastOnline = {}

    state.playersData.forEach(player => {
      if (!player.last_online) return
      const ts = new Date(player.last_online.replace(' ', 'T') + 'Z').getTime()
      if (isNaN(ts)) return

      if (player.char_id && player.char_id !== 'NULL') {
        state.playerLastOnline[player.char_id] = ts
      }
      if (player.guild_id && player.guild_id !== 'NULL') {
        if (!state.guildLastOnline[player.guild_id] || ts > state.guildLastOnline[player.guild_id]) {
          state.guildLastOnline[player.guild_id] = ts
        }
      }
    })
  })
}

export function drawData() {
  if (!state.activeServerId) return
  const kinds = Object.keys(state.activeKinds)
  if (kinds.length === 0) {
    clearAllLayers()
    rebuildClanFilterMenu()
    return
  }

  state.allMarkersData = []
  let remaining = kinds.length
  let allMarkers = []
  let lastUpdate = null

  kinds.forEach(kind => {
    const url = kind.replace(/_/g, '/')
    $.getJSON(`api/${state.activeServerId}/${url}`, data => {
      if (data.update) lastUpdate = data.update
      if (data.data) {
        data.data.forEach(item => { item._kind = kind })
        state.allMarkersData = state.allMarkersData.concat(data.data)
        allMarkers = allMarkers.concat(data.data)
      }
      remaining--
      if (remaining === 0) {
        if (lastUpdate) $('.lastupdate').html(lastUpdate)
        renderMarkers(allMarkers)
        updateFilterCounts()
      }
    }).fail(() => {
      remaining--
      if (remaining === 0) renderMarkers(allMarkers)
    })
  })
}

export function updateFilterCounts() {
  const counts = {}
  state.allMarkersData.forEach(item => {
    if (!isOnActiveMap(item.x)) return
    const k = item._kind
    counts[k] = (counts[k] || 0) + 1
  })
  $('.filter-item').each(function () {
    const id = $(this).attr('id')
    if (!id) return
    const kind = id.replace(/-filter$/, '')
    const n = counts[kind]
    $(this).find('.filter-count').text(n !== undefined ? n : '')
  })
}

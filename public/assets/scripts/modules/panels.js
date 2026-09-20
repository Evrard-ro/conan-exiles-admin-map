import { state, mapConfigs } from './state.js'
import { escapeHtml, toLatLng, isOnActiveMap } from './utils.js'
import { parseThrallInfo, tierBadgeClass, getOwnerById } from './tooltips.js'
import { pulseMarker } from './markers.js'
import { drawData } from './api.js'
import { updateTerritories } from './territories.js'

export function openPanel(name) {
  const $btn = $(`.sb-btn[data-panel="${name}"]`)
  if ($btn.hasClass('active')) {
    closePanel()
    return
  }
  closePanel()
  $(`#panel-${name}`).addClass('open')
  $btn.addClass('active')
}

export function closePanel() {
  $('.overlay-panel').removeClass('open')
  $('.sb-btn:not(.map-btn)').removeClass('active')
  $('#search-input').val('')
  $('#search-results').empty()
}

export function showPlayerList() {
  if (!state.activeServerId) return
  $.getJSON(`api/${state.activeServerId}/players`, data => {
    state.playersData = data.data || []
    state.playersSearch = ''
    $('#players-search').val('')
    renderPlayerTable()
    openPanel('players')
  })
}

export function renderPlayerTable() {
  const q = state.playersSearch.toLowerCase()
  const filtered = state.playersData.filter(p => {
    if (!q) return true
    return (p.char_name || '').toLowerCase().indexOf(q) !== -1 ||
           (p.guild_name || '').toLowerCase().indexOf(q) !== -1
  })

  filtered.sort((a, b) => {
    let va = a[state.playersSort.key]
    let vb = b[state.playersSort.key]
    if (state.playersSort.key === 'level' || state.playersSort.key === 'rank') {
      va = parseInt(va, 10) || 0
      vb = parseInt(vb, 10) || 0
      if (va < vb) return state.playersSort.dir === 'asc' ? -1 : 1
      if (va > vb) return state.playersSort.dir === 'asc' ? 1 : -1
      return 0
    }
    va = String(va || '').toLowerCase()
    vb = String(vb || '').toLowerCase()
    if (va < vb) return state.playersSort.dir === 'asc' ? -1 : 1
    if (va > vb) return state.playersSort.dir === 'asc' ? 1 : -1
    return 0
  })

  $('.players-list-table-head .sortable').each(function () {
    $(this).removeClass('sort-asc sort-desc')
    if ($(this).data('sort-key') === state.playersSort.key) {
      $(this).addClass(state.playersSort.dir === 'asc' ? 'sort-asc' : 'sort-desc')
    }
  })

  let html = ''
  filtered.forEach(player => {
    html += `<tr class="player-list-item${player.online == 1 ? ' player-online-row' : ''}">`
    html += `<td>${escapeHtml(player.char_name)}</td>`
    html += `<td>${escapeHtml(player.guild_name)}</td>`
    html += `<td>${escapeHtml(player.rank)}</td>`
    html += `<td>${escapeHtml(player.level)}</td>`
    html += `<td>${escapeHtml(player.last_online)}</td>`
    html += `</tr>`
  })
  $('.players-list-table').html(html)
}

export function redrawAll() {
  drawData()
}

export function getActivityInfo(lastSeen) {
  if (!lastSeen) return { cls: 'grey', label: 'Unknown' }
  const daysAgo = Math.floor((Date.now() - lastSeen) / 86400000)
  if (daysAgo === 0) return { cls: 'green', label: 'Online today' }
  if (daysAgo <= 7) return { cls: 'green', label: `${daysAgo}d ago` }
  if (daysAgo <= 30) return { cls: 'yellow', label: `${daysAgo}d ago` }
  return { cls: 'grey', label: `${daysAgo}d ago` }
}

export function rebuildClanFilterMenu() {
  const currentGroups = state.clusterEnabled ? state.clusterGroups : state.markerLayers
  const groups = Object.keys(currentGroups)
  const menu = $('#clan-filter-menu')
  const q = ($('#clan-filter-search').val() || '').toLowerCase()

  let totalCount = 0
  const groupData = groups.map(id => {
    const layers = currentGroups[id]
    const count = layers.getLayers ? layers.getLayers().length : 0
    totalCount += count
    return {
      id,
      name: state.groupNames[id] || id,
      color: state.groupColors[id] || '#666',
      count,
      lastSeen: state.guildLastOnline[id] || state.playerLastOnline[id] || null
    }
  })

  if (state.clanSortMode === 'name') {
    groupData.sort((a, b) => a.name.localeCompare(b.name))
  } else if (state.clanSortMode === 'activity') {
    groupData.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
  } else {
    groupData.sort((a, b) => b.count - a.count)
  }

  if (state.clanFilter !== 'all' && !currentGroups[state.clanFilter]) {
    state.clanFilter = 'all'
  }

  menu.empty()

  const ph = window.language?.phrases || {}
  const allLabel = ph['ui.all_clans'] || 'All clans'
  const allItem = $('<a>')
    .addClass(`clan-item-all${state.clanFilter === 'all' ? ' active' : ''}`)
    .attr('href', '#')
    .attr('data-clan', 'all')
    .html(`${escapeHtml(allLabel)} <span class="clan-count-badge">${totalCount}</span>`)
    .on('click', e => {
      e.preventDefault()
      selectClanFilter('all')
    })
  menu.append(allItem)

  groupData.forEach(g => {
    if (q && g.name.toLowerCase().indexOf(q) === -1) return
    const act = getActivityInfo(g.lastSeen)
    const isActive = state.clanFilter === g.id
    const item = $('<div>')
      .addClass(`clan-item-expanded${isActive ? ' active' : ''}`)
      .attr('data-clan', g.id)
      .html(
        `<div class="clan-exp-top">` +
          `<span class="clan-dot" style="background:${escapeHtml(g.color)}"></span>` +
          `<span class="clan-exp-name">${escapeHtml(g.name)}</span>` +
          `<span class="clan-count-badge">${g.count}</span>` +
        `</div>` +
        `<div class="clan-exp-sub">` +
          `<span class="clan-act-dot ${act.cls}"></span>` +
          `<span class="clan-act-label ${act.cls}">${escapeHtml(act.label)}</span>` +
        `</div>`
      )
      .on('click', () => selectClanFilter(g.id))
    menu.append(item)
  })
}

export function selectClanFilter(id) {
  state.clanFilter = id
  rebuildClanFilterMenu()
  applyClanFilter()
  updateTerritories()
}

export function applyClanFilter() {
  const groups = state.clusterEnabled ? state.clusterGroups : state.markerLayers
  Object.keys(groups).forEach(id => {
    if (state.clanFilter === 'all' || id === state.clanFilter) {
      if (!state.map.hasLayer(groups[id])) state.map.addLayer(groups[id])
    } else {
      if (state.map.hasLayer(groups[id])) state.map.removeLayer(groups[id])
    }
  })
}

export function navigateToResult(x, y) {
  state.map.panTo(toLatLng(x, y))
  const lm = state.markerByCoords[`${x},${y}`]
  if (lm) pulseMarker(lm)
}

export function searchTypeLabel(kind) {
  const ph = window.language?.phrases || {}
  const labels = {
    thrall: ph['ui.thrall'] || 'Thrall',
    pet: ph['ui.pet'] || 'Pet',
    player: ph['ui.player'] || 'Player',
    clan: ph['ui.guild'] || 'Guild',
    building: ph['ui.buildings'] || 'Building'
  }
  return labels[kind] || kind
}

export function renderSearchResult(item, type) {
  let name, sub, badge

  if (type === 'clan') {
    name = item.name
    sub = `${item.count} markers`
    badge = ''
  } else if (type === 'thrall') {
    const parsed = parseThrallInfo(item.info)
    name = item.name || '—'
    sub = (parsed.faction || '') + (item.owner ? ` · ${getOwnerById(item.owner) || item.owner}` : '')
    badge = parsed.tier ? `<span class="badge ${tierBadgeClass(parsed.tier)}">${parsed.tier}</span>` : ''
  } else if (type === 'pet') {
    name = item.name || '—'
    sub = (item.info || '') + (item.owner ? ` · ${getOwnerById(item.owner) || item.owner}` : '')
    badge = item.greater ? `<span class="badge badge-alpha">Alpha</span>` : ''
  } else if (type === 'player') {
    name = item.char_name || '—'
    sub = item.guild_name || ''
    badge = item.online == 1 ? `<span class="badge badge-online">● Online</span>` : ''
  } else {
    const ph = window.language?.phrases || {}
    const translatedKind = (item.kind && ph['items.' + item.kind]) || item.kind || item.class || ''
    name = translatedKind
    sub = item.guild_name || item.char_name || ''
    badge = ''
  }

  return $('<div>').addClass('search-result')
    .attr('data-x', item.x || null)
    .attr('data-y', item.y || null)
    .html(
      `<span class="result-type">${escapeHtml(searchTypeLabel(type))}</span>` +
      `<div class="result-main">` +
        `<div class="result-name">${escapeHtml(name)}</div>` +
        (sub ? `<div class="result-sub">${escapeHtml(sub)}</div>` : '') +
      `</div>` +
      badge
    )
    .on('click', () => {
      if (type === 'clan') {
        selectClanFilter(item.id)
      } else {
        navigateToResult(parseFloat(item.x), parseFloat(item.y))
      }
      closePanel()
    })
}

export function performSearch(query) {
  const $results = $('#search-results')
  $results.empty()
  const q = (query || '').toLowerCase().trim()
  if (!q) return

  const MAX_PER_GROUP = 10
  const ph = window.language?.phrases || {}
  const groups = {
    thralls: { label: ph['ui.thralls'] || 'Thralls', items: [] },
    pets: { label: ph['ui.pets'] || 'Pets', items: [] },
    players: { label: ph['ui.players'] || 'Players', items: [] },
    building: { label: ph['ui.buildings'] || 'Buildings', items: [] },
    clan: { label: ph['ui.clan_filter'] || 'Clans', items: [] }
  }

  state.allMarkersData.forEach(item => {
    if (!isOnActiveMap(item.x)) return
    const kind = item._kind
    let group, fields

    if (kind === 'thralls') {
      group = groups.thralls
      const ownerName = getOwnerById(item.owner) || ''
      fields = [item.name, item.info, ownerName]
    } else if (kind === 'pets') {
      group = groups.pets
      const ownerName = getOwnerById(item.owner) || ''
      fields = [item.name, item.info, ownerName]
    } else if (kind === 'players') {
      group = groups.players
      fields = [item.char_name, item.guild_name]
    } else {
      group = groups.building
      const tKind = (item.kind && ph['items.' + item.kind]) || item.kind || ''
      fields = [tKind, item.guild_name, item.char_name]
    }

    if (group.items.length >= MAX_PER_GROUP) return
    const matched = fields.some(s => s && String(s).toLowerCase().indexOf(q) !== -1)
    if (matched) group.items.push(item)
  })

  // Clan search from groupNames
  Object.keys(state.groupNames).forEach(id => {
    if (groups.clan.items.length >= MAX_PER_GROUP) return
    const name = state.groupNames[id] || ''
    if (name.toLowerCase().indexOf(q) !== -1) {
      const layers = (state.clusterEnabled ? state.clusterGroups : state.markerLayers)[id]
      const count = layers && layers.getLayers ? layers.getLayers().length : 0
      groups.clan.items.push({ id, name, count, _clan: true })
    }
  })

  let hasAny = false
  const typeKeys = ['thralls', 'pets', 'players', 'building', 'clan']
  typeKeys.forEach(key => {
    const g = groups[key]
    if (!g.items.length) return
    hasAny = true
    $results.append(`<div class="search-group-label">${escapeHtml(g.label)} (${g.items.length})</div>`)
    g.items.forEach(item => {
      $results.append(renderSearchResult(item, key === 'building' ? key : key.replace(/s$/, '')))
    })
  })

  if (!hasAny) {
    $results.html('<div class="search-empty">Nothing found</div>')
  }
}

export function toggleFilter(kind) {
  const normKind = kind.replace('/', '_')
  if (state.activeKinds['all']) {
    delete state.activeKinds['all']
  }
  if (state.activeKinds[normKind]) {
    delete state.activeKinds[normKind]
    $(`#${normKind}-filter`).removeClass('active')
  } else {
    state.activeKinds[normKind] = true
    $(`#${normKind}-filter`).addClass('active')
  }
  if (Object.keys(state.activeKinds).length === 0) {
    state.activeKinds = { 'all': true }
    $('.filter-item').removeClass('active')
  }
  drawData()
}

export function showAll() {
  state.activeKinds = { 'all': true }
  $('.filter-item').removeClass('active')
  drawData()
}

export function resetFilters() {
  state.activeKinds = { 'all': true }
  state.clanFilter = 'all'
  state.inactiveDays = 0
  state.clusterEnabled = false
  state.territoriesEnabled = false
  $('.filter-item').removeClass('active')
  $('#inactive-days').val('')
  $('#cluster-toggle').prop('checked', false)
  $('#territories-toggle').prop('checked', false)
  $('#btn-territories').removeClass('active')
  $('#clan-filter-search').val('')
  updateTerritories()
  drawData()
}

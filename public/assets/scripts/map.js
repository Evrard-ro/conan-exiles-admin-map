var playersData = []
var playersSort = { key: 'char_name', dir: 'asc' }
var playersSearch = ''
var markerLayers = {}
var groupNames = {}
var groupColors = {}
var map
var mapMinZoom = 2
var mapMaxZoom = 6
var mapConfigs = {
  exiledlands: {
    label: 'Exiled Lands',
    rangeX: [-296000, 412000],
    rangeY: [-292000, 353500],
    tiles: 'assets/tiles/{z}/{x}/{y}.webp',
    xMax: 800000
  },
  siptah: {
    label: 'Isle of Siptah',
    rangeX: [1118122, 1979015],
    rangeY: [-263282, 528457],
    tiles: 'assets/tiles-siptah/{z}/{x}/{y}.webp',
    xMin: 1000000
  }
}
var activeMap = 'exiledlands'
var tileLayer = null
var mapBounds = null
var boundsX = [ 14.4, 230.7 ]
var boundsY = [ -47.7, -245.3 ]
var activeKinds = {}
var clanFilter = 'all'
var clanSortMode = 'count'
var inactiveDays = 0
var clusterEnabled = false
var clusterGroups = {}
var activeServerId = null
var allMarkersData = []
var markerByCoords = {}
var playerLastOnline = {}
var guildLastOnline = {}
var circleMarkerOptions = {
  color: 'black',
  weight: 1,
  fillColor: 'rgb(0, 187, 204)',
  fillOpacity: 1,
  radius: 5
}

var tooltipOptions = {
  direction: 'top'
}

var colorhash = new ColorHash({
  lightness: [ 0.4, 0.5, 0.6 ],
  saturation: [ 0.6, 0.8, 1 ]
})

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function convertRange( value, r1, r2 ) {
  return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0]
}

function toLatLng(x, y) {
  var cfg = mapConfigs[activeMap]
  return [ convertRange(y, cfg.rangeY, boundsY), convertRange(x, cfg.rangeX, boundsX) ]
}

function fromLatLng(lat, lng) {
  var cfg = mapConfigs[activeMap]
  return {
    x: Math.round(convertRange(lng, boundsX, cfg.rangeX)),
    y: Math.round(convertRange(lat, boundsY, cfg.rangeY))
  }
}

function loadServers () {
  $.getJSON('api/servers', function (servers) {
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
  }).fail(function () {
    toastr.error('Failed to load server list.')
  })
}

function renderServersList (servers) {
  var html = ''
  servers.forEach(function (s) {
    var ago = s.timestamp ? timeSince(new Date(s.timestamp)) : 'never'
    var active = s.id === activeServerId ? ' server-active' : ''
    html += '<div class="server-item' + active + '">'
    html += '<span class="server-radio">' + (s.id === activeServerId ? '◉' : '○') + '</span>'
    html += '<span class="server-name" onclick="selectServer(' + JSON.stringify(s.id).replace(/"/g, '&quot;') + ')">' + escapeHtml(s.name) + '</span>'
    html += '<span class="server-ago">updated ' + ago + '</span>'
    html += '<button class="server-refresh-btn" onclick="refreshServer(' + JSON.stringify(s.id).replace(/"/g, '&quot;') + ')"' + (s.refreshing ? ' disabled' : '') + '>Refresh</button>'
    html += '</div>'
  })
  $('#servers-list').html(html)
}

function timeSince (date) {
  var seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  var minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + ' min. ago'
  var hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + ' h. ago'
  return Math.floor(hours / 24) + ' d. ago'
}

function selectServer (serverId) {
  activeServerId = serverId
  closePanel()
  getPlayers()
  showAll()
}

function refreshServer (serverId) {
  $.ajax({
    url: 'api/' + serverId + '/refresh',
    method: 'POST',
    success: function (data) {
      toastr.success('Server data updated')
      if (serverId === activeServerId) {
        getPlayers()
        showAll()
      }
      $.getJSON('api/servers', function (servers) { renderServersList(servers) })
    },
    error: function (xhr) {
      var body = xhr.responseJSON || {}
      if (xhr.status === 429) {
        var mins = Math.ceil((body.retryAfter || 0) / 60)
        toastr.warning('Next refresh available in ' + mins + ' min.')
      } else if (xhr.status === 409) {
        toastr.info('Refresh already in progress.')
      } else {
        toastr.error('Refresh failed.')
      }
    }
  })
}

function init() {
  map = L.map('map', {
    maxZoom: mapMaxZoom,
    minZoom: mapMinZoom,
    crs: L.CRS.Simple,
    attributionControl: false,
    zoomControl: false,
    maxBoundsViscosity: 1
  })

  mapBounds = new L.LatLngBounds(
    map.unproject([0, 16128], mapMaxZoom),
    map.unproject([16128, 0], mapMaxZoom)
  )

  map.setMaxBounds(mapBounds)
  map.setView(mapBounds.getCenter(), 2)

  tileLayer = L.tileLayer(mapConfigs[activeMap].tiles, {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    minNativeZoom: mapMaxZoom,
    maxNativeZoom: mapMaxZoom,
    bounds: mapBounds,
    tms: false,
    updateWhenIdle: true,
    keepBuffer: 0,
    updateWhenZooming: false
  }).addTo(map)

  // Sidebar panel toggles
  $('.sb-btn[data-panel]').on('click', function () {
    var name = $(this).data('panel')
    if (name === 'players') {
      showPlayerList()
    } else if (name === 'search') {
      openPanel('search')
      setTimeout(function () { $('#search-input').focus() }, 50)
    } else {
      openPanel(name)
    }
  })

  $(document).on('click', '.panel-close', function () {
    closePanel()
  })

  $('#map').on('click', function () {
    closePanel()
  })

  $('#inactive-days').on('input', function () {
    inactiveDays = parseInt($(this).val(), 10) || 0
    redrawAll()
  })

  $('#cluster-toggle').on('change', function () {
    clusterEnabled = $(this).is(':checked')
    redrawAll()
  })

  // Filter item clicks
  $(document).on('click', '.filter-item', function () {
    var kind = $(this).attr('id').replace(/-filter$/, '')
    toggleFilter(kind)
  })

  // Map switch buttons
  $(document).on('click', '.map-btn', function () {
    switchMap($(this).data('map'))
  })

  // Keep dropdown open when interacting with search inside it
  $('#clan-filter-menu').on('click', function (e) {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('click', function (e) {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('input', function () {
    rebuildClanFilterMenu()
  })

  $(document).on('click', '.clan-sort-btn', function () {
    clanSortMode = $(this).data('sort')
    $('.clan-sort-btn').removeClass('active')
    $(this).addClass('active')
    rebuildClanFilterMenu()
  })

  $('#players-search').on('input', function () {
    playersSearch = $(this).val()
    renderPlayerTable()
  })

  $(document).on('click', '.players-list-table-head .sortable', function () {
    var key = $(this).data('sort-key')
    if (playersSort.key === key) {
      playersSort.dir = playersSort.dir === 'asc' ? 'desc' : 'asc'
    } else {
      playersSort.key = key
      playersSort.dir = 'asc'
    }
    renderPlayerTable()
  })

  $(document).on('input', '#search-input', function () {
    performSearch($(this).val())
  })

  $(document).on('keydown', '#search-input', function (e) {
    if (e.key === 'Enter') {
      var first = $('#search-results .search-result').first()
      if (first.length) first.trigger('click')
    }
  })

  map.on('mousemove', function (e) {
    if ($('#coord-debug').is(':visible')) {
      var c = fromLatLng(e.latlng.lat, e.latlng.lng)
      $('#coord-text').text('TeleportPlayer ' + c.x + ' ' + c.y + ' 0')
    }
  })

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      openPanel('search')
      setTimeout(function () { $('#search-input').focus() }, 50)
    }
    if (e.key === 'Escape') {
      closePanel()
    }
    if (e.shiftKey && e.code === 'KeyC') {
      $('#coord-debug').toggle()
    }
  }, true)

  loadServers()
}

function switchMap(name) {
  if (name === activeMap) return
  activeMap = name

  if (tileLayer) map.removeLayer(tileLayer)
  tileLayer = L.tileLayer(mapConfigs[name].tiles, {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    minNativeZoom: mapMaxZoom,
    maxNativeZoom: mapMaxZoom,
    bounds: mapBounds,
    tms: false,
    updateWhenIdle: true,
    keepBuffer: 0,
    updateWhenZooming: false
  }).addTo(map)

  map.setView(mapBounds.getCenter(), 2)
  drawData()

  $('.map-btn').removeClass('active')
  $('.map-btn').filter(function () { return $(this).data('map') === name }).addClass('active')
}

function makeBadge (cls, text) {
  return '<span class="badge ' + cls + '">' + escapeHtml(text) + '</span>'
}

function tipRow (label, value) {
  var val = (value === null || value === undefined || value === '' || value === 'Unknown')
    ? '<span class="tip-val-dim">—</span>'
    : '<span class="tip-val">' + escapeHtml(String(value)) + '</span>'
  return '<div class="tip-row"><span class="tip-lbl">' + escapeHtml(label) + '</span>' + val + '</div>'
}

function parseThrallInfo (info) {
  if (!info) return { faction: '', tier: null }
  var m = info.match(/\b(T[1-4])\b/i)
  if (!m) return { faction: info, tier: null }
  return { tier: m[1].toUpperCase(), faction: info.replace(m[0], '').trim() }
}

function tierBadgeClass (tier) {
  return { T1: 'badge-t1', T2: 'badge-t2', T3: 'badge-t3', T4: 'badge-t4' }[tier] || ''
}

function getTooltipContent (marker) {
  var ph = language.phrases
  var header = ''
  var badge = ''
  var rows = ''
  var kind = marker._kind || ''

  if (kind === 'players') {
    header = ph['ui.player'] || 'Player'
    badge = marker.online == 1 ? makeBadge('badge-online', '● Online') : ''
    rows += tipRow(ph['ui.guild'] || 'Guild', marker.guild_name)
    rows += tipRow(ph['ui.rank'] || 'Rank', marker.rank)
    rows += tipRow(ph['ui.level'] || 'Level', marker.level)

  } else if (kind === 'thralls') {
    var parsed = parseThrallInfo(marker.info)
    header = ph['ui.thrall'] || 'Thrall'
    badge = parsed.tier ? makeBadge(tierBadgeClass(parsed.tier), parsed.tier) : ''
    rows += tipRow(ph['ui.name'] || 'Name', marker.name)
    rows += tipRow(ph['ui.faction'] || 'Faction', parsed.faction)
    rows += tipRow(ph['ui.owner'] || 'Owner', getOwnerById(marker.owner) || String(marker.owner || '—'))

  } else if (kind === 'pets') {
    header = ph['ui.pet'] || 'Pet'
    badge = marker.greater ? makeBadge('badge-alpha', 'Alpha') : ''
    rows += tipRow(ph['ui.name'] || 'Name', marker.name)
    rows += tipRow(ph['ui.species'] || 'Species', marker.info)
    rows += tipRow(ph['ui.owner'] || 'Owner', getOwnerById(marker.owner) || String(marker.owner || '—'))

  } else {
    // Building (and pippi)
    var translatedKind = marker.kind ? (ph['items.' + marker.kind] || marker.kind) : ''
    header = translatedKind
    if (marker.guild_name) rows += tipRow(ph['ui.guild'] || 'Guild', marker.guild_name)
    else rows += tipRow(ph['ui.player'] || 'Player', marker.char_name)
  }

  var tip = '<div class="tip-header">' + escapeHtml(header)
  if (badge) tip += ' ' + badge
  tip += '</div>'
  tip += rows
  tip += '<div class="tip-sep"></div>'
  tip += '<div class="tip-tele">🖱 ' + (ph['ui.teleport_hint'] || 'click to copy teleport') + '</div>'
  return tip
}

function clearAllLayers () {
  markerByCoords = {}

  Object.keys(markerLayers).forEach(function (k) {
    if (map.hasLayer(markerLayers[k])) map.removeLayer(markerLayers[k])
    markerLayers[k].clearLayers()
  })
  markerLayers = {}

  Object.keys(clusterGroups).forEach(function (k) {
    if (map.hasLayer(clusterGroups[k])) map.removeLayer(clusterGroups[k])
  })
  clusterGroups = {}

  groupNames = {}
  groupColors = {}
}

function isOnActiveMap(x) {
  var cfg = mapConfigs[activeMap]
  if (cfg.xMax !== undefined && x >= cfg.xMax) return false
  if (cfg.xMin !== undefined && x < cfg.xMin) return false
  return true
}

function renderMarkers (markers) {
  clearAllLayers()

  markers.forEach(function (marker) {
    if (!isOnActiveMap(marker.x)) return
    if (!isOwnerInactive(marker)) return

    var group = 'default'
    marker.stroke = 'black'

    if (marker.guild_name) {
      group = marker.guild_id
      marker.color = colorhash.hex(marker.guild_id + marker.guild_name)
      groupNames[group] = marker.guild_name
      groupColors[group] = marker.color
    } else if (marker.char_name) {
      group = marker.char_id
      marker.color = colorhash.hex(marker.char_id + marker.char_name)
      groupNames[group] = marker.char_name
      groupColors[group] = marker.color
    } else if (marker.owner) {
      var owner = getOwnerById(marker.owner)
      group = marker.owner
      marker.guild_name = owner
      marker.color = colorhash.hex(marker.owner + owner) || 'pink'
      groupNames[group] = owner || String(marker.owner)
      groupColors[group] = marker.color
    } else if (marker.info) {
      marker.color = 'yellow'
    }

    if (marker.online == 1) {
      marker.stroke = 'white'
    }

    marker.tooltip = getTooltipContent(marker)

    if (clusterEnabled) {
      if (!clusterGroups[group]) {
        var cgColor = marker.color || '#666'
        var cg = L.markerClusterGroup({
          iconCreateFunction: makeClusterIcon(cgColor),
          maxClusterRadius: 80,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false
        })
        cg.on('clustermouseover', function (e) {
          e.layer.unbindTooltip()
          e.layer.bindTooltip(clusterTooltipHtml(e.layer), { direction: 'top', sticky: true, opacity: 0.95 }).openTooltip()
        })
        cg.on('clustermouseout', function (e) {
          e.layer.closeTooltip()
          e.layer.unbindTooltip()
        })
        clusterGroups[group] = cg
      }
      createMarkerInCluster(marker, clusterGroups[group])
    } else {
      createMarker(marker, group)
    }
  })

  if (clusterEnabled) {
    Object.keys(clusterGroups).forEach(function (k) {
      clusterGroups[k].addTo(map)
    })
  } else {
    Object.keys(markerLayers).forEach(function (k) {
      markerLayers[k].addTo(map)
    })
  }

  applyClanFilter()
  rebuildClanFilterMenu()
}

function drawData () {
  if (!activeServerId) return
  var kinds = Object.keys(activeKinds)
  if (kinds.length === 0) {
    clearAllLayers()
    rebuildClanFilterMenu()
    return
  }
  allMarkersData = []
  var remaining = kinds.length
  var allMarkers = []
  var lastUpdate = null

  kinds.forEach(function (kind) {
    var url = kind.replace(/_/g, '/')
    $.getJSON('api/' + activeServerId + '/' + url, function (data) {
      if (data.update) lastUpdate = data.update
      if (data.data) {
        data.data.forEach(function (item) { item._kind = kind })
        allMarkersData = allMarkersData.concat(data.data)
        allMarkers = allMarkers.concat(data.data)
      }
      remaining--
      if (remaining === 0) {
        if (lastUpdate) $('.lastupdate').html(lastUpdate)
        renderMarkers(allMarkers)
        updateFilterCounts()
      }
    }).fail(function () {
      remaining--
      if (remaining === 0) renderMarkers(allMarkers)
    })
  })
}

function updateFilterCounts () {
  var counts = {}
  allMarkersData.forEach(function (item) {
    if (!isOnActiveMap(item.x)) return
    var k = item._kind
    counts[k] = (counts[k] || 0) + 1
  })
  $('.filter-item').each(function () {
    var id = $(this).attr('id')
    if (!id) return
    var kind = id.replace(/-filter$/, '')
    var n = counts[kind]
    $(this).find('.filter-count').text(n !== undefined ? n : '')
  })
}

function getOwnerById (ownerId) {
  var id = String(ownerId)
  var owner
  playersData.find(function (player) {
    if (String(player.char_id) === id) {
      owner = player.char_name
      return true
    }
    if (String(player.guild_id) === id) {
      owner = player.guild_name
      return true
    }
  })
  return owner || false
}

function toggleFilter (kind) {
  kind = kind.replace('/', '_')
  // Remove 'all' shorthand when switching to specific filters
  if (activeKinds['all']) {
    delete activeKinds['all']
  }
  if (activeKinds[kind]) {
    delete activeKinds[kind]
    $('#' + kind + '-filter').removeClass('active')
  } else {
    activeKinds[kind] = true
    $('#' + kind + '-filter').addClass('active')
  }
  // Auto-fallback to View all when all checkboxes unchecked
  if (Object.keys(activeKinds).length === 0) {
    activeKinds = { 'all': true }
    $('.filter-item').removeClass('active')
  }
  drawData()
}

function showAll () {
  activeKinds = { 'all': true }
  $('.filter-item').removeClass('active')
  drawData()
}

function resetFilters () {
  activeKinds = { 'all': true }
  clanFilter = 'all'
  inactiveDays = 0
  clusterEnabled = false
  $('.filter-item').removeClass('active')
  $('#inactive-days').val('')
  $('#cluster-toggle').prop('checked', false)
  $('#clan-filter-search').val('')
  drawData()
}

function onClick (point) {
  var input = document.createElement('textarea')
  document.body.appendChild(input)
  input.value = point.target.options.teleport
  input.select()
  document.execCommand('copy')
  input.remove()
  toastr.success(language.phrases['ui.teleport_copied'])
}

function createMarker(marker, group) {
  var opt = Object.assign({}, circleMarkerOptions)
  opt.fillColor = marker.color || opt.color
  opt.color = marker.stroke || opt.stroke
  opt.teleport = 'TeleportPlayer ' + marker.x + ' ' + marker.y + ' ' + marker.z

  if (group && !markerLayers[group]) markerLayers[group] = L.layerGroup()

  var point = L.circleMarker(toLatLng(marker.x, marker.y), opt)
    .bindTooltip(marker.tooltip, tooltipOptions)
    .on('click', onClick)

  markerByCoords[marker.x + ',' + marker.y] = point

  if (group) {
    point.addTo(markerLayers[group])
    return
  }
  point.addTo(map)
}

function openPanel (name) {
  var $btn = $('.sb-btn[data-panel="' + name + '"]')
  if ($btn.hasClass('active')) {
    closePanel()
    return
  }
  closePanel()
  $('#panel-' + name).addClass('open')
  $btn.addClass('active')
}

function closePanel () {
  $('.overlay-panel').removeClass('open')
  $('.sb-btn:not(.map-btn)').removeClass('active')
  $('#search-input').val('')
  $('#search-results').empty()
}

function showPlayerList () {
  if (!activeServerId) return
  $.getJSON('api/' + activeServerId + '/players', function (data) {
    playersData = data.data
    playersSearch = ''
    $('#players-search').val('')
    renderPlayerTable()
    openPanel('players')
  })
}

function renderPlayerTable () {
  var q = playersSearch.toLowerCase()
  var filtered = playersData.filter(function (p) {
    if (!q) return true
    return (p.char_name || '').toLowerCase().indexOf(q) !== -1 ||
           (p.guild_name || '').toLowerCase().indexOf(q) !== -1
  })

  filtered.sort(function (a, b) {
    var va = a[playersSort.key]
    var vb = b[playersSort.key]
    if (playersSort.key === 'level' || playersSort.key === 'rank') {
      va = parseInt(va) || 0
      vb = parseInt(vb) || 0
      if (va < vb) return playersSort.dir === 'asc' ? -1 : 1
      if (va > vb) return playersSort.dir === 'asc' ? 1 : -1
      return 0
    }
    va = String(va || '').toLowerCase()
    vb = String(vb || '').toLowerCase()
    if (va < vb) return playersSort.dir === 'asc' ? -1 : 1
    if (va > vb) return playersSort.dir === 'asc' ? 1 : -1
    return 0
  })

  $('.players-list-table-head .sortable').each(function () {
    $(this).removeClass('sort-asc sort-desc')
    if ($(this).data('sort-key') === playersSort.key) {
      $(this).addClass(playersSort.dir === 'asc' ? 'sort-asc' : 'sort-desc')
    }
  })

  var html = ''
  filtered.forEach(function (player) {
    html += '<tr class="player-list-item' + (player.online == 1 ? ' player-online-row' : '') + '">'
    html += '<td>' + escapeHtml(player.char_name) + '</td>'
    html += '<td>' + escapeHtml(player.guild_name) + '</td>'
    html += '<td>' + escapeHtml(player.rank) + '</td>'
    html += '<td>' + escapeHtml(player.level) + '</td>'
    html += '<td>' + escapeHtml(player.last_online) + '</td>'
    html += '</tr>'
  })
  $('.players-list-table').html(html)
}

function redrawAll () {
  drawData()
}

function isOwnerInactive (marker) {
  if (!inactiveDays || inactiveDays <= 0) return true
  var lastSeen
  if (marker.guild_id) {
    lastSeen = guildLastOnline[String(marker.guild_id)]
  } else if (marker.char_id) {
    lastSeen = playerLastOnline[String(marker.char_id)]
  } else if (marker.owner) {
    var ownerId = String(marker.owner)
    lastSeen = playerLastOnline[ownerId] || guildLastOnline[ownerId]
  }
  if (lastSeen == null) return true
  var thresholdMs = Date.now() - inactiveDays * 86400000
  return lastSeen <= thresholdMs
}

function createMarkerInCluster (marker, clusterGroup) {
  var opt = Object.assign({}, circleMarkerOptions)
  opt.fillColor = marker.color || opt.fillColor
  opt.color = marker.stroke || 'black'
  opt.teleport = 'TeleportPlayer ' + marker.x + ' ' + marker.y + ' ' + marker.z
  opt.markerGuildId = marker.guild_id || null
  opt.markerGuildName = marker.guild_name || ''
  opt.markerCharId = marker.char_id || null
  opt.markerCharName = marker.char_name || ''

  var point = L.circleMarker(toLatLng(marker.x, marker.y), opt)
    .bindTooltip(marker.tooltip, tooltipOptions)
    .on('click', onClick)
    .addTo(clusterGroup)

  markerByCoords[marker.x + ',' + marker.y] = point
}

function makeClusterIcon (color) {
  return function (cluster) {
    var size = 40
    return L.divIcon({
      html: '<div class="cluster-icon" style="background-color:' + escapeHtml(color) + ';width:' + size + 'px;height:' + size + 'px;">' + cluster.getChildCount() + '</div>',
      className: '',
      iconSize: L.point(size, size)
    })
  }
}

function clusterTooltipHtml (cluster) {
  var markers = cluster.getAllChildMarkers()
  var seen = {}
  var rows = ''
  var labelOnline = language.phrases['ui.last_online'] || 'Last online'
  var labelPlayer = language.phrases['ui.player'] || 'Player'

  rows += '<tr><th>' + escapeHtml(labelPlayer) + '</th><th>' + escapeHtml(labelOnline) + '</th></tr>'

  markers.forEach(function (m) {
    var id = m.options.markerGuildId || m.options.markerCharId
    if (seen[id]) return
    seen[id] = true

    var name = m.options.markerGuildName || m.options.markerCharName || '?'
    var ts = m.options.markerGuildId
      ? guildLastOnline[m.options.markerGuildId]
      : playerLastOnline[m.options.markerCharId]
    var timeStr = ts ? new Date(ts).toLocaleString() : '-'
    rows += '<tr><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(timeStr) + '</td></tr>'
  })

  return '<div class="cluster-tooltip"><table>' + rows + '</table></div>'
}

function getActivityInfo (lastSeen) {
  if (!lastSeen) return { cls: 'grey', label: 'Unknown' }
  var daysAgo = Math.floor((Date.now() - lastSeen) / 86400000)
  if (daysAgo === 0) return { cls: 'green', label: 'Online today' }
  if (daysAgo <= 7)  return { cls: 'green', label: daysAgo + 'd ago' }
  if (daysAgo <= 30) return { cls: 'yellow', label: daysAgo + 'd ago' }
  return { cls: 'grey', label: daysAgo + 'd ago' }
}

function rebuildClanFilterMenu () {
  var currentGroups = clusterEnabled ? clusterGroups : markerLayers
  var groups = Object.keys(currentGroups)
  var menu = $('#clan-filter-menu')
  var q = ($('#clan-filter-search').val() || '').toLowerCase()

  // Build group data
  var totalCount = 0
  var groupData = groups.map(function (id) {
    var layers = currentGroups[id]
    var count = layers.getLayers ? layers.getLayers().length : 0
    totalCount += count
    return {
      id: id,
      name: groupNames[id] || id,
      color: groupColors[id] || '#666',
      count: count,
      lastSeen: guildLastOnline[id] || playerLastOnline[id] || null
    }
  })

  // Sort
  if (clanSortMode === 'name') {
    groupData.sort(function (a, b) { return a.name.localeCompare(b.name) })
  } else if (clanSortMode === 'activity') {
    groupData.sort(function (a, b) { return (b.lastSeen || 0) - (a.lastSeen || 0) })
  } else {
    groupData.sort(function (a, b) { return b.count - a.count })
  }

  // Reset to 'all' if selected clan disappeared
  if (clanFilter !== 'all' && !currentGroups[clanFilter]) {
    clanFilter = 'all'
  }

  // Render
  menu.empty()

  // All clans row
  var allLabel = (language.phrases['ui.all_clans'] || 'All clans')
  var allItem = $('<a>')
    .addClass('clan-item-all' + (clanFilter === 'all' ? ' active' : ''))
    .attr('href', '#')
    .attr('data-clan', 'all')
    .html(escapeHtml(allLabel) + ' <span class="clan-count-badge">' + totalCount + '</span>')
    .on('click', function (e) { e.preventDefault(); selectClanFilter('all') })
  menu.append(allItem)

  // Clan rows
  groupData.forEach(function (g) {
    if (q && g.name.toLowerCase().indexOf(q) === -1) return
    var act = getActivityInfo(g.lastSeen)
    var isActive = clanFilter === g.id
    var item = $('<div>')
      .addClass('clan-item-expanded' + (isActive ? ' active' : ''))
      .attr('data-clan', g.id)
      .html(
        '<div class="clan-exp-top">' +
          '<span class="clan-dot" style="background:' + escapeHtml(g.color) + '"></span>' +
          '<span class="clan-exp-name">' + escapeHtml(g.name) + '</span>' +
          '<span class="clan-count-badge">' + g.count + '</span>' +
        '</div>' +
        '<div class="clan-exp-sub">' +
          '<span class="clan-act-dot ' + act.cls + '"></span>' +
          '<span class="clan-act-label ' + act.cls + '">' + escapeHtml(act.label) + '</span>' +
        '</div>'
      )
      .on('click', function () { selectClanFilter(g.id) })
    menu.append(item)
  })
}

function selectClanFilter (id) {
  clanFilter = id
  rebuildClanFilterMenu()
  applyClanFilter()
}

function applyClanFilter () {
  var groups = clusterEnabled ? clusterGroups : markerLayers
  Object.keys(groups).forEach(function (id) {
    if (clanFilter === 'all' || id === clanFilter) {
      if (!map.hasLayer(groups[id])) map.addLayer(groups[id])
    } else {
      if (map.hasLayer(groups[id])) map.removeLayer(groups[id])
    }
  })
}

function pulseMarker (lm) {
  lm.setStyle({ color: 'white', weight: 4 })
  setTimeout(function () { lm.setStyle({ color: 'black', weight: 1 }) }, 2000)
}

function navigateToResult (x, y) {
  map.panTo(toLatLng(x, y))
  var lm = markerByCoords[x + ',' + y]
  if (lm) pulseMarker(lm)
}

function searchTypeLabel (kind) {
  var ph = language.phrases
  var labels = {
    thrall:   ph['ui.thrall']    || 'Thrall',
    pet:      ph['ui.pet']       || 'Pet',
    player:   ph['ui.player']    || 'Player',
    clan:     ph['ui.guild']     || 'Guild',
    building: ph['ui.buildings'] || 'Building'
  }
  return labels[kind] || kind
}

function renderSearchResult (item, type) {
  var name, sub, badge

  if (type === 'clan') {
    name = item.name
    sub = item.count + ' markers'
    badge = ''
  } else if (type === 'thrall') {
    var parsed = parseThrallInfo(item.info)
    name = item.name || '—'
    sub = (parsed.faction || '') + (item.owner ? ' · ' + (getOwnerById(item.owner) || item.owner) : '')
    badge = parsed.tier ? '<span class="badge ' + tierBadgeClass(parsed.tier) + '">' + parsed.tier + '</span>' : ''
  } else if (type === 'pet') {
    name = item.name || '—'
    sub = (item.info || '') + (item.owner ? ' · ' + (getOwnerById(item.owner) || item.owner) : '')
    badge = item.greater ? '<span class="badge badge-alpha">Alpha</span>' : ''
  } else if (type === 'player') {
    name = item.char_name || '—'
    sub = item.guild_name || ''
    badge = item.online == 1 ? '<span class="badge badge-online">● Online</span>' : ''
  } else {
    var translatedKind = (item.kind && language.phrases['items.' + item.kind]) || item.kind || item.class || ''
    name = translatedKind
    sub = item.guild_name || item.char_name || ''
    badge = ''
  }

  var el = $('<div>').addClass('search-result')
    .attr('data-x', item.x || null)
    .attr('data-y', item.y || null)
    .html(
      '<span class="result-type">' + escapeHtml(searchTypeLabel(type)) + '</span>' +
      '<div class="result-main">' +
        '<div class="result-name">' + escapeHtml(name) + '</div>' +
        (sub ? '<div class="result-sub">' + escapeHtml(sub) + '</div>' : '') +
      '</div>' +
      badge
    )
    .on('click', function () {
      if (type === 'clan') {
        selectClanFilter(item.id)
      } else {
        navigateToResult(parseFloat(item.x), parseFloat(item.y))
      }
      closePanel()
    })
  return el
}

function performSearch (query) {
  var $results = $('#search-results')
  $results.empty()
  var q = (query || '').toLowerCase().trim()
  if (!q) return

  var MAX_PER_GROUP = 10
  var groups = {
    thralls:  { label: language.phrases['ui.thralls'] || 'Thralls',  items: [] },
    pets:     { label: language.phrases['ui.pets']    || 'Pets',     items: [] },
    players:  { label: language.phrases['ui.players'] || 'Players',  items: [] },
    building: { label: language.phrases['ui.buildings'] || 'Buildings', items: [] },
    clan:     { label: language.phrases['ui.clan_filter'] || 'Clans', items: [] }
  }

  allMarkersData.forEach(function (item) {
    if (!isOnActiveMap(item.x)) return
    var kind = item._kind
    var group, fields

    if (kind === 'thralls') {
      group = groups.thralls
      var ownerName = getOwnerById(item.owner) || ''
      fields = [item.name, item.info, ownerName]
    } else if (kind === 'pets') {
      group = groups.pets
      var ownerName = getOwnerById(item.owner) || ''
      fields = [item.name, item.info, ownerName]
    } else if (kind === 'players') {
      group = groups.players
      fields = [item.char_name, item.guild_name]
    } else {
      group = groups.building
      var tKind = (item.kind && language.phrases['items.' + item.kind]) || item.kind || ''
      fields = [tKind, item.guild_name, item.char_name]
    }

    if (group.items.length >= MAX_PER_GROUP) return
    var matched = fields.some(function (s) { return s && String(s).toLowerCase().indexOf(q) !== -1 })
    if (matched) group.items.push(item)
  })

  // Clan search from groupNames
  Object.keys(groupNames).forEach(function (id) {
    if (groups.clan.items.length >= MAX_PER_GROUP) return
    var name = groupNames[id] || ''
    if (name.toLowerCase().indexOf(q) !== -1) {
      var layers = (clusterEnabled ? clusterGroups : markerLayers)[id]
      var count = layers && layers.getLayers ? layers.getLayers().length : 0
      groups.clan.items.push({ id: id, name: name, count: count, _clan: true })
    }
  })

  var hasAny = false
  var typeKeys = ['thralls', 'pets', 'players', 'building', 'clan']
  typeKeys.forEach(function (key) {
    var g = groups[key]
    if (!g.items.length) return
    hasAny = true
    $results.append('<div class="search-group-label">' + escapeHtml(g.label) + ' (' + g.items.length + ')</div>')
    g.items.forEach(function (item) {
      $results.append(renderSearchResult(item, key === 'building' ? key : key.replace(/s$/, '')))
    })
  })

  if (!hasAny) {
    $results.html('<div class="search-empty">Nothing found</div>')
  }
}

function getPlayers () {
  if (!activeServerId) return
  $.getJSON('api/' + activeServerId + '/players', function (data) {
    playersData = data.data
    playerLastOnline = {}
    guildLastOnline = {}

    data.data.forEach(function (player) {
      if (!player.last_online) return
      var ts = new Date(player.last_online.replace(' ', 'T') + 'Z').getTime()
      if (isNaN(ts)) return

      if (player.char_id && player.char_id !== 'NULL') {
        playerLastOnline[player.char_id] = ts
      }
      if (player.guild_id && player.guild_id !== 'NULL') {
        if (!guildLastOnline[player.guild_id] || ts > guildLastOnline[player.guild_id]) {
          guildLastOnline[player.guild_id] = ts
        }
      }
    })
  })
}

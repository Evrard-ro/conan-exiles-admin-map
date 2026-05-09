var playersData = []
var playersSort = { key: 'char_name', dir: 'asc' }
var playersSearch = ''
var markerLayers = {}
var groupNames = {}
var groupColors = {}
var map
var mapMinZoom = 2
var mapMaxZoom = 6
var rangeX = [ -296000, 412000 ]
var rangeY = [ -292000, 353500 ]
var boundsX = [ 14.4, 230.7 ]
var boundsY = [ -47.7, -245.3 ]
var activeKinds = {}
var clanFilter = 'all'
var inactiveDays = 0
var clusterEnabled = false
var clusterGroups = {}
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
  return [ convertRange(y, rangeY, boundsY), convertRange(x, rangeX, boundsX) ]
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

  var mapBounds = new L.LatLngBounds(
    map.unproject([0, 16128], mapMaxZoom),
    map.unproject([16128, 0], mapMaxZoom)
  )

  map.setMaxBounds(mapBounds)
  map.fitBounds(mapBounds)

  L.tileLayer('assets/tiles/{z}/{x}/{y}.png', {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    bounds: mapBounds,
    tms: false
  }).addTo(map)

  $('#inactive-days').on('input', function () {
    inactiveDays = parseInt($(this).val(), 10) || 0
    redrawAll()
  })

  $('#cluster-toggle').on('change', function () {
    clusterEnabled = $(this).is(':checked')
    redrawAll()
  })

  // Keep Filters dropdown open when selecting categories (close only on Reset)
  $('.filters .dropdown-menu').on('click', '.dropdown-item:not(#reset-filters)', function (e) {
    e.stopPropagation()
  })

  // Keep Settings dropdown open when interacting with inputs
  $('#settings-menu').on('click', function (e) {
    e.stopPropagation()
  })

  // Keep dropdown open when interacting with search inside it
  $('#clan-filter-menu').on('click', function (e) {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('click', function (e) {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('input', function () {
    var q = $(this).val().toLowerCase()
    $('#clan-filter-menu .clan-item').each(function () {
      $(this).toggle($(this).text().toLowerCase().indexOf(q) !== -1)
    })
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

  getPlayers()
  showAll()
}

function getTooltipContent (marker) {
  var content = ''

  if (marker.kind) {
    marker.kind = language.phrases['items.' + marker.kind] || marker.kind
    content += marker.kind + '<br/>'
  }
  if (marker.name) content += marker.name + '<br/>'
  if (marker.info) content += marker.info + '<br/>'
  if (marker.char_name) content += marker.char_name + '<br/>'
  if (marker.guild_name) content += marker.guild_name + '<br/>'
  return content
}

function clearAllLayers () {
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

function renderMarkers (markers) {
  clearAllLayers()

  markers.forEach(function (marker) {
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
  var kinds = Object.keys(activeKinds)
  if (kinds.length === 0) {
    clearAllLayers()
    rebuildClanFilterMenu()
    return
  }
  var remaining = kinds.length
  var allMarkers = []
  var lastUpdate = null

  kinds.forEach(function (kind) {
    var url = kind.replace('_', '/')
    $.getJSON('api/' + url, function (data) {
      if (data.update) lastUpdate = data.update
      if (data.data) allMarkers = allMarkers.concat(data.data)
      remaining--
      if (remaining === 0) {
        if (lastUpdate) $('.lastupdate').html(lastUpdate)
        renderMarkers(allMarkers)
      }
    })
  })
}

function getOwnerById (ownerId) {
  var owner

  playersData.find(function (player) {
    if (player.char_id === ownerId) {
      owner = player.char_name
      return true
    }
    if (player.guild_id === ownerId) {
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
    $('.filters .dropdown-item').removeClass('active')
  }
  drawData()
}

function showAll () {
  activeKinds = { 'all': true }
  $('.filters .dropdown-item').removeClass('active')
  drawData()
}

function resetFilters () {
  activeKinds = { 'all': true }
  clanFilter = 'all'
  inactiveDays = 0
  clusterEnabled = false
  $('.filters .dropdown-item').removeClass('active')
  $('#inactive-days').val('')
  $('#cluster-toggle').prop('checked', false)
  $('#clan-filter-search').val('')
  $('#clan-filter-menu .dropdown-item').removeClass('active')
  $('#clan-filter-menu [data-clan="all"]').addClass('active')
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

  if (group) {
    point.addTo(markerLayers[group])
    return
  }
  point.addTo(map)
}

function showPlayerList () {
  $.getJSON('api/players', function (data) {
    playersData = data.data
    playersSearch = ''
    $('#players-search').val('')
    renderPlayerTable()
    $('#playersList').modal()
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
    var bgcolor = player.online == 1 ? '#FFFFAA' : '#FFFFFF'
    html += '<tr class="player-list-item" bgcolor="' + bgcolor + '">'
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
    lastSeen = guildLastOnline[marker.guild_id]
  } else if (marker.char_id) {
    lastSeen = playerLastOnline[marker.char_id]
  } else if (marker.owner) {
    lastSeen = playerLastOnline[marker.owner] || guildLastOnline[marker.owner]
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

  L.circleMarker(toLatLng(marker.x, marker.y), opt)
    .bindTooltip(marker.tooltip, tooltipOptions)
    .on('click', onClick)
    .addTo(clusterGroup)
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

function rebuildClanFilterMenu () {
  var currentGroups = clusterEnabled ? clusterGroups : markerLayers
  var groups = Object.keys(currentGroups)
  var menu = $('#clan-filter-menu')
  menu.find('.clan-item').remove()

  // If the selected clan no longer exists in the current data, reset to 'all'
  if (clanFilter !== 'all' && !currentGroups[clanFilter]) {
    clanFilter = 'all'
    menu.find('.dropdown-item').removeClass('active')
    menu.find('[data-clan="all"]').addClass('active')
  }

  groups.forEach(function (id) {
    var name = groupNames[id] || id
    var color = groupColors[id] || '#666'
    var isActive = clanFilter === id
    var item = $('<a>')
      .addClass('dropdown-item clan-item' + (isActive ? ' active' : ''))
      .attr('href', '#')
      .attr('data-clan', id)
      .html('<span class="clan-dot" style="background:' + escapeHtml(color) + '"></span>' + escapeHtml(name))
      .on('click', function (e) {
        e.preventDefault()
        e.stopPropagation()
        selectClanFilter(id)
      })
    menu.append(item)
  })
}

function selectClanFilter (id) {
  clanFilter = id
  $('#clan-filter-menu .dropdown-item').removeClass('active')
  $('#clan-filter-menu .dropdown-item').each(function () {
    if ($(this).attr('data-clan') === id) $(this).addClass('active')
  })
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

function getPlayers () {
  $.getJSON('api/players', function (data) {
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

import { state } from './state.js'
import { escapeHtml } from './utils.js'

export function makeBadge(cls, text) {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`
}

export function tipRow(label, value) {
  const val = (value === null || value === undefined || value === '' || value === 'Unknown')
    ? '<span class="tip-val-dim">—</span>'
    : `<span class="tip-val">${escapeHtml(String(value))}</span>`
  return `<div class="tip-row"><span class="tip-lbl">${escapeHtml(label)}</span>${val}</div>`
}

export function parseThrallInfo(info) {
  if (!info) return { faction: '', tier: null }
  const m = info.match(/\b(T[1-4])\b/i)
  if (!m) return { faction: info, tier: null }
  return { tier: m[1].toUpperCase(), faction: info.replace(m[0], '').trim() }
}

export function tierBadgeClass(tier) {
  return { T1: 'badge-t1', T2: 'badge-t2', T3: 'badge-t3', T4: 'badge-t4' }[tier] || ''
}

export function getOwnerById(ownerId) {
  const id = String(ownerId)
  let owner = false
  state.playersData.some(player => {
    if (String(player.char_id) === id) {
      owner = player.char_name
      return true
    }
    if (String(player.guild_id) === id) {
      owner = player.guild_name
      return true
    }
    return false
  })
  return owner
}

export function getTooltipContent(marker) {
  const ph = window.language?.phrases || {}
  let header = ''
  let badge = ''
  let rows = ''
  const kind = marker._kind || ''

  if (kind === 'players') {
    header = ph['ui.player'] || 'Player'
    badge = marker.online == 1 ? makeBadge('badge-online', '● Online') : ''
    rows += tipRow(ph['ui.guild'] || 'Guild', marker.guild_name)
    rows += tipRow(ph['ui.rank'] || 'Rank', marker.rank)
    rows += tipRow(ph['ui.level'] || 'Level', marker.level)

  } else if (kind === 'thralls') {
    const parsed = parseThrallInfo(marker.info)
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
    // Buildings & Pippi
    const translatedKind = marker.kind ? (ph['items.' + marker.kind] || marker.kind) : ''
    header = translatedKind
    if (marker.guild_name) rows += tipRow(ph['ui.guild'] || 'Guild', marker.guild_name)
    else rows += tipRow(ph['ui.player'] || 'Player', marker.char_name)
  }

  let tip = `<div class="tip-header">${escapeHtml(header)}`
  if (badge) tip += ` ${badge}`
  tip += `</div>`
  tip += rows
  tip += `<div class="tip-sep"></div>`
  tip += `<div class="tip-tele">🖱 ${ph['ui.teleport_hint'] || 'click to copy teleport'}</div>`
  return tip
}

export function makeClusterIcon(color) {
  return function (cluster) {
    const size = 40
    return L.divIcon({
      html: `<div class="cluster-icon" style="background-color:${escapeHtml(color)};width:${size}px;height:${size}px;">${cluster.getChildCount()}</div>`,
      className: '',
      iconSize: L.point(size, size)
    })
  }
}

export function clusterTooltipHtml(cluster) {
  const markers = cluster.getAllChildMarkers()
  const seen = {}
  let rows = ''
  const ph = window.language?.phrases || {}
  const labelOnline = ph['ui.last_online'] || 'Last online'
  const labelPlayer = ph['ui.player'] || 'Player'

  rows += `<tr><th>${escapeHtml(labelPlayer)}</th><th>${escapeHtml(labelOnline)}</th></tr>`

  markers.forEach(m => {
    const id = m.options.markerGuildId || m.options.markerCharId
    if (seen[id]) return
    seen[id] = true

    const name = m.options.markerGuildName || m.options.markerCharName || '?'
    const ts = m.options.markerGuildId
      ? state.guildLastOnline[m.options.markerGuildId]
      : state.playerLastOnline[m.options.markerCharId]
    const timeStr = ts ? new Date(ts).toLocaleString() : '-'
    rows += `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(timeStr)}</td></tr>`
  })

  return `<div class="cluster-tooltip"><table>${rows}</table></div>`
}

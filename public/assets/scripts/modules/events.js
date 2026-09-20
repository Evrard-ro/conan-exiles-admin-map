import { state } from './state.js'
import { fromLatLng } from './utils.js'
import {
  openPanel,
  closePanel,
  showPlayerList,
  rebuildClanFilterMenu,
  renderPlayerTable,
  performSearch,
  toggleFilter,
  redrawAll
} from './panels.js'
import { switchMap } from './map.js'

export function initEvents() {
  // Sidebar panel toggles
  $('.sb-btn[data-panel]').on('click', function () {
    const name = $(this).data('panel')
    if (name === 'players') {
      showPlayerList()
    } else if (name === 'search') {
      openPanel('search')
      setTimeout(() => $('#search-input').focus(), 50)
    } else {
      openPanel(name)
    }
  })

  $(document).on('click', '.panel-close', () => {
    closePanel()
  })

  $('#map').on('click', () => {
    closePanel()
  })

  $('#inactive-days').on('input', function () {
    state.inactiveDays = parseInt($(this).val(), 10) || 0
    redrawAll()
  })

  $('#cluster-toggle').on('change', function () {
    state.clusterEnabled = $(this).is(':checked')
    redrawAll()
  })

  // Filter item clicks
  $(document).on('click', '.filter-item', function () {
    const kind = $(this).attr('id').replace(/-filter$/, '')
    toggleFilter(kind)
  })

  // Map switch buttons
  $(document).on('click', '.map-btn', function () {
    switchMap($(this).data('map'))
  })

  // Keep dropdown open when interacting with search inside it
  $('#clan-filter-menu').on('click', e => {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('click', e => {
    e.stopPropagation()
  })
  $('#clan-filter-search').on('input', () => {
    rebuildClanFilterMenu()
  })

  $(document).on('click', '.clan-sort-btn', function () {
    state.clanSortMode = $(this).data('sort')
    $('.clan-sort-btn').removeClass('active')
    $(this).addClass('active')
    rebuildClanFilterMenu()
  })

  $('#players-search').on('input', function () {
    state.playersSearch = $(this).val()
    renderPlayerTable()
  })

  $(document).on('click', '.players-list-table-head .sortable', function () {
    const key = $(this).data('sort-key')
    if (state.playersSort.key === key) {
      state.playersSort.dir = state.playersSort.dir === 'asc' ? 'desc' : 'asc'
    } else {
      state.playersSort.key = key
      state.playersSort.dir = 'asc'
    }
    renderPlayerTable()
  })

  $(document).on('input', '#search-input', function () {
    performSearch($(this).val())
  })

  $(document).on('keydown', '#search-input', function (e) {
    if (e.key === 'Enter') {
      const first = $('#search-results .search-result').first()
      if (first.length) first.trigger('click')
    }
  })

  state.map.on('mousemove', function (e) {
    if ($('#coord-debug').is(':visible')) {
      const c = fromLatLng(e.latlng.lat, e.latlng.lng)
      $('#coord-text').text(`TeleportPlayer ${c.x} ${c.y} 0`)
    }
  })

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      openPanel('search')
      setTimeout(() => $('#search-input').focus(), 50)
    }
    if (e.key === 'Escape') {
      closePanel()
    }
    if (e.shiftKey && e.code === 'KeyC') {
      $('#coord-debug').toggle()
    }
  }, true)
}

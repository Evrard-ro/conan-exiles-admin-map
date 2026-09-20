import { state, mapConfigs, mapMinZoom, mapMaxZoom } from './state.js'
import { drawData } from './api.js'

export function initMap() {
  state.map = L.map('map', {
    maxZoom: mapMaxZoom,
    minZoom: mapMinZoom,
    crs: L.CRS.Simple,
    attributionControl: false,
    zoomControl: false,
    maxBoundsViscosity: 1
  })

  state.mapBounds = new L.LatLngBounds(
    state.map.unproject([0, 16128], mapMaxZoom),
    state.map.unproject([16128, 0], mapMaxZoom)
  )

  state.map.setMaxBounds(state.mapBounds)
  state.map.setView(state.mapBounds.getCenter(), 2)

  // Initialize Canvas renderer with padding for optimized marker drawing
  state.canvasRenderer = L.canvas({ padding: 0.5 })

  state.tileLayer = L.tileLayer(mapConfigs[state.activeMap].tiles, {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    bounds: state.mapBounds,
    tms: false,
    keepBuffer: 2
  }).addTo(state.map)

  return state.map
}

export function switchMap(name) {
  if (name === state.activeMap) return
  state.activeMap = name

  if (state.tileLayer && state.map) {
    state.map.removeLayer(state.tileLayer)
  }

  state.tileLayer = L.tileLayer(mapConfigs[name].tiles, {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    bounds: state.mapBounds,
    tms: false,
    keepBuffer: 2
  }).addTo(state.map)

  state.map.setView(state.mapBounds.getCenter(), 2)
  drawData()

  $('.map-btn').removeClass('active')
  $(`.map-btn[data-map="${name}"]`).addClass('active')
}

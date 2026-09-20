/**
 * Central state and configuration for the Conan Exiles Admin Map
 */

export const mapConfigs = {
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

export const boundsX = [14.4, 230.7]
export const boundsY = [-47.7, -245.3]
export const mapMinZoom = 2
export const mapMaxZoom = 6

export const circleMarkerOptions = {
  color: 'black',
  weight: 1,
  fillColor: 'rgb(0, 187, 204)',
  fillOpacity: 1,
  radius: 5
}

export const tooltipOptions = {
  direction: 'top'
}

export const colorhash = new ColorHash({
  lightness: [0.4, 0.5, 0.6],
  saturation: [0.6, 0.8, 1]
})

export const state = {
  map: null,
  tileLayer: null,
  mapBounds: null,
  canvasRenderer: null,
  activeMap: 'exiledlands',
  activeServerId: null,
  activeKinds: { 'all': true },
  clanFilter: 'all',
  clanSortMode: 'count',
  inactiveDays: 0,
  clusterEnabled: false,
  playersData: [],
  playersSort: { key: 'char_name', dir: 'asc' },
  playersSearch: '',
  markerLayers: {},
  clusterGroups: {},
  groupNames: {},
  groupColors: {},
  allMarkersData: [],
  markerByCoords: {},
  playerLastOnline: {},
  guildLastOnline: {}
}

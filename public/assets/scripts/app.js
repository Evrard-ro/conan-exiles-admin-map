/**
 * Conan Exiles Admin Map - Application Entry Point
 */
import { initMap } from './modules/map.js'
import { initEvents } from './modules/events.js'
import { loadServers, selectServer, refreshServer } from './modules/api.js'
import { resetFilters } from './modules/panels.js'
import { toggleTerritories, updateTerritories } from './modules/territories.js'
import { toggleRuler, clearRuler } from './modules/ruler.js'

let initialized = false

export function init() {
  if (initialized) return
  initialized = true

  initMap()
  initEvents()
  loadServers()
}

// Expose globals for inline HTML event handlers and buttons
window.init = init
window.selectServer = selectServer
window.refreshServer = refreshServer
window.resetFilters = resetFilters
window.toggleTerritories = toggleTerritories
window.updateTerritories = updateTerritories
window.toggleRuler = toggleRuler
window.clearRuler = clearRuler

// Automatically initialize if DOM is ready, or on DOMContentLoaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init()
} else {
  document.addEventListener('DOMContentLoaded', init)
}

const WaterWellsController = require('../../controllers/api/waterwells')

module.exports = (app) => {

  const waterwells = new WaterWellsController()

  app.get('/api/waterwells', function (req, res) {
    return waterwells.getAll(req, res)
  })

}

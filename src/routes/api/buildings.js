const BuildingsController = require('../../controllers/api/buildings')

module.exports = (app) => {

  const buildings = new BuildingsController()

  app.get('/api/buildings', function (req, res) {
    return buildings.getAll(req, res)
  })

}

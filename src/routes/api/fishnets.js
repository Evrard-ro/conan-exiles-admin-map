const FishnetsController = require('../../controllers/api/fishnets')

module.exports = (app) => {

  const fishnets = new FishnetsController()

  app.get('/api/fishnets', function (req, res) {
    return fishnets.getAll(req, res)
  })

}

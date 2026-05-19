const CrabpotsController = require('../../controllers/api/crabpots')

module.exports = (app) => {

  const crabpots = new CrabpotsController()

  app.get('/api/crabpots', function (req, res) {
    return crabpots.getAll(req, res)
  })

}

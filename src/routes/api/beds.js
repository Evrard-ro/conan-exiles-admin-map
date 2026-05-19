const BedsController = require('../../controllers/api/beds')

module.exports = (app) => {

  const beds = new BedsController()

  app.get('/api/beds', function (req, res) {
    return beds.getAll(req, res)
  })

}

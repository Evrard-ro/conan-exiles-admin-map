const CampfiresController = require('../../controllers/api/campfires')

module.exports = (app) => {

  const campfires = new CampfiresController()

  app.get('/api/campfires', function (req, res) {
    return campfires.getAll(req, res)
  })

}

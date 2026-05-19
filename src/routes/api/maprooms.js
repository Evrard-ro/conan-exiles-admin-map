const MapRoomsController = require('../../controllers/api/maprooms')

module.exports = (app) => {

  const maprooms = new MapRoomsController()

  app.get('/api/maprooms', function (req, res) {
    return maprooms.getAll(req, res)
  })

}

const AltarsController = require('../../controllers/api/altars')

module.exports = (app) => {

  const altars = new AltarsController()

  app.get('/api/altars', function (req, res) {
    return altars.getAll(req, res)
  })

}

const ChestsController = require('../../controllers/api/chests')

module.exports = (app) => {

  const chests = new ChestsController()

  app.get('/api/chests', function (req, res) {
    return chests.getAll(req, res)
  })

}

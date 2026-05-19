const TrebuchetsController = require('../../controllers/api/trebuchets')

module.exports = (app) => {

  const trebuchets = new TrebuchetsController()

  app.get('/api/trebuchets', function (req, res) {
    return trebuchets.getAll(req, res)
  })

}

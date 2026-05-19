const PlayersController = require('../../controllers/api/players')

module.exports = (app) => {

  const players = new PlayersController()

  app.get('/api/players', function (req, res) {
    return players.getAll(req, res)
  })

}

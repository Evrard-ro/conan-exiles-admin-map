const ThrallsController = require('../../controllers/api/thralls')

module.exports = (app) => {

  const thralls = new ThrallsController()

  app.get('/api/thralls', async function (req, res) {
    return await thralls.getAll(req, res)
  })

}

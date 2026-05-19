const AllController = require('../../controllers/api/all')

module.exports = (app) => {

  const all = new AllController()

  app.get('/api/all', function (req, res) {
    return all.getAll(req, res)
  })

}

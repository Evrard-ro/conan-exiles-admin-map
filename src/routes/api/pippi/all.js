const PippiAllController = require('../../../controllers/api/pippi/all')

module.exports = (app) => {

  const pippiAll = new PippiAllController()

  app.get('/api/pippi/all', function (req, res) {
    return pippiAll.getAll(req, res)
  })

}

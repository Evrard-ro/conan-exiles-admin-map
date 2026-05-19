const PippiThespiansController = require('../../../controllers/api/pippi/thespians')

module.exports = (app) => {

  const pippiThespians = new PippiThespiansController()

  app.get('/api/pippi/thespians', function (req, res) {
    return pippiThespians.getAll(req, res)
  })

}

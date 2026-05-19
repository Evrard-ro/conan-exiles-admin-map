const AnimalPensController = require('../../controllers/api/animalpens')

module.exports = (app) => {

  const animalpens = new AnimalPensController()

  app.get('/api/animalpens', function (req, res) {
    return animalpens.getAll(req, res)
  })

}

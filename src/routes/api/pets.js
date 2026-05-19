const PetsController = require('../../controllers/api/pets')

module.exports = (app) => {

  const pets = new PetsController()

  app.get('/api/pets', function (req, res) {
    return pets.getAll(req, res)
  })

}

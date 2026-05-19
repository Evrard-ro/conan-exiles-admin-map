const CraftingController = require('../../controllers/api/crafting')

module.exports = (app) => {

  const crafting = new CraftingController()

  app.get('/api/crafting', function (req, res) {
    return crafting.getAll(req, res)
  })

}

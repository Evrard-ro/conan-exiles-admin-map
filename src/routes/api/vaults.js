const VaultsController = require('../../controllers/api/vaults')

module.exports = (app) => {

  const vaults = new VaultsController()

  app.get('/api/vaults', function (req, res) {
    return vaults.getAll(req, res)
  })

}

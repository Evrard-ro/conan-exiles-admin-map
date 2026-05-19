const WheelsOfPainController = require('../../controllers/api/wheelsofpain')

module.exports = (app) => {

  const wheelsOfPain = new WheelsOfPainController()

  app.get('/api/wheelsofpain', function (req, res) {
    return wheelsOfPain.getAll(req, res)
  })

}

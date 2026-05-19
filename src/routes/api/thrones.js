const ThronesController = require('../../controllers/api/thrones')

module.exports = (app) => {

    const thrones = new ThronesController()

    app.get('/api/thrones', function (req, res) {
        return thrones.getAll(req, res)
    })

}
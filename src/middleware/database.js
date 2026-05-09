import { statSync } from 'fs'
import config from '../config'

const databaseMiddleware = (app) => {

  const database = config.CONAN_EXILES.database

  app.set('database', database)

  app.use((req, res, next) => {
    let time = null
    try {
      time = new Date(statSync(database).mtime).toLocaleString()
    } catch (e) {
      console.error('Cannot stat database file:', e.message)
    }
    res.database = { file: database, time }
    next()
  })

}

export default databaseMiddleware

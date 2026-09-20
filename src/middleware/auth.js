import { timingSafeEqual } from 'crypto'
import auth from 'basic-auth'
import config from '../config'

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function createAuthMiddleware(users) {
  return (req, res, next) => {
    if (!users.size) return next()

    const credentials = auth(req)
    const entry = credentials ? users.get(credentials.name) : null

    if (!entry || !credentials?.pass || !safeCompare(entry.password, credentials.pass)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="ConanExilesAdminMap"')
      return res.status(401).send('Unauthorized')
    }

    res.locals.user = { username: credentials.name, servers: entry.servers }
    return next()
  }
}

const authMiddleware = (app) => {
  app.use(createAuthMiddleware(config.users))
}

export default authMiddleware

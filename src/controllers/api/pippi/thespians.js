const Database = require('better-sqlite3')
const SmartBuffer = require('smart-buffer').SmartBuffer

const queries = require('../../../config/sql')

class PippiThespiansController {

  getAll (req, res) {
    try {
      const db = new Database(res.database.file, { readonly: true })
      const data = db.prepare(queries.pippiThespians).all()
      db.close()

      data.forEach((pippi) => {
        pippi.name = getPippiMobName(pippi)
        pippi.info = getPippiMobProfession(pippi)
        delete pippi.buffer
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

function getPippiMobName (pippi) {
  const pippiName = SmartBuffer.fromBuffer(pippi.buffer).readString('ascii')
  const position = pippiName.indexOf('StrProperty')

  let name = pippiName.substr(position + 25, pippiName.indexOf('profession') - position - 26).trim()
  name = JSON.stringify(name)
    .replace(/\\u[0-9a-f]{4}/gi, '')
    .replace(/\\[bfnrt]/gi, '')
    .replace(/\"/gi, '')
    .slice(0, -1)

  return name
}

function getPippiMobProfession (pippi) {
  let pippiProfession = SmartBuffer.fromBuffer(pippi.buffer).readString('ascii')
  pippiProfession = pippiProfession.substr(pippiProfession.indexOf('profession'))
  const position = pippiProfession.indexOf('StrProperty')

  let name = pippiProfession.substr(position + 25, pippiProfession.indexOf('isInteraction') - position - 25).trim()
  name = JSON.stringify(name)
    .replace(/\\u[0-9a-f]{4}/gi, '')
    .replace(/\\[bfnrt]/gi, '')
    .replace(/\"/gi, '')
    .slice(0, -1)

  return name
}

module.exports = PippiThespiansController

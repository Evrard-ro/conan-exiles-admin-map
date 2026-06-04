const Database = require('better-sqlite3')
const queries = require('../../config/sql')

class ThrallsController {

  getAll (req, res) {
    try {
      const db = new Database(res.database.file, { readonly: true })
      const data = db.prepare(queries.thralls).all()
      db.close()

      data.forEach((thrall) => {
        thrall.name = getThrallName(thrall)
        thrall.info = getThrallInfo(thrall)
        thrall.owner = getThrallOwnerId(thrall)
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

// UE4 FString at offset 41: int32 LE length (negative = UTF-16LE, positive = ASCII/UTF-8)
function getThrallName (thrall) {
  if (!thrall.name) return 'Unknown'
  const buf = Buffer.isBuffer(thrall.name) ? thrall.name : Buffer.from(thrall.name)
  if (buf.length < 46) return 'Unknown'

  const strLen = buf.readInt32LE(41)
  if (strLen === 0) return 'Unknown'

  if (strLen < 0) {
    const charCount = Math.abs(strLen) - 1
    const end = 45 + charCount * 2
    if (end > buf.length) return 'Unknown'
    return buf.slice(45, end).toString('utf16le')
  }

  if (strLen > 0 && strLen < 256) {
    const end = 45 + strLen - 1
    if (end > buf.length) return 'Unknown'
    return buf.slice(45, end).toString('utf8')
  }

  return 'Unknown'
}

// UE4 FString at offset 16: int32 LE string length (always positive ASCII)
// String data starts at offset 20, format: "Faction_Role_Tier_Race"
function getThrallInfo (thrall) {
  if (!thrall.info) return ''
  const buf = Buffer.isBuffer(thrall.info) ? thrall.info : Buffer.from(thrall.info)
  if (buf.length < 20) return ''

  const strLen = buf.readInt32LE(16)
  if (strLen <= 0 || strLen > 200) return ''

  const end = 20 + strLen - 1
  if (end > buf.length) return ''

  return buf.slice(20, end).toString('ascii').replace(/_/g, ' ')
}

function getThrallOwnerId (thrall) {
  if (!thrall.owner) return 0
  const buf = Buffer.isBuffer(thrall.owner) ? thrall.owner : Buffer.from(thrall.owner)
  if (buf.length < 8) return 0
  return buf.readUInt32LE(buf.length - 8)
}

module.exports = ThrallsController

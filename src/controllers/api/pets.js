const Database = require('better-sqlite3')
const queries = require('../../config/sql')

class PetsController {

  getAll (req, res) {
    try {
      const db = new Database(res.database.file, { readonly: true })
      const data = db.prepare(queries.pets).all()
      db.close()

      data.forEach((pet) => {
        pet.name = getPetName(pet)
        pet.info = getPetInfo(pet)
        pet.owner = getPetOwnerId(pet)
        pet.greater = /[Aa]lpha[Pp]et|[Pp]et[Aa]lpha/i.test(pet.class || '')
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

// UE4 FString at offset 41: int32 LE length (negative = UTF-16LE, positive = ASCII/UTF-8)
function getPetName (pet) {
  if (!pet.name) return 'Unknown'
  const buf = Buffer.isBuffer(pet.name) ? pet.name : Buffer.from(pet.name)
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

// UE4 FString at offset 16: int32 LE string length (always positive ASCII in current format)
// String data starts at offset 20, format: "Pet_Tiger" or "pet_Whitetiger"
function getPetInfo (pet) {
  if (!pet.info) return ''
  const buf = Buffer.isBuffer(pet.info) ? pet.info : Buffer.from(pet.info)
  if (buf.length < 20) return ''

  const strLen = buf.readInt32LE(16)
  if (strLen <= 0 || strLen > 100) return ''

  const end = 20 + strLen - 1
  if (end > buf.length) return ''

  return buf.slice(20, end).toString('ascii').replace(/^[Pp]et_/i, '').replace(/_/g, ' ')
}

function getPetOwnerId (pet) {
  if (!pet.owner) return 0
  const buf = Buffer.isBuffer(pet.owner) ? pet.owner : Buffer.from(pet.owner)
  if (buf.length < 8) return 0
  return buf.readUInt32LE(buf.length - 8)
}

module.exports = PetsController

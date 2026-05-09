const Database = require('better-sqlite3')
const SmartBuffer = require('smart-buffer').SmartBuffer
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
        pet.greater = pet.info.indexOf('Greater') > -1
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

function getPetName (pet) {
  const petName = SmartBuffer.fromBuffer(pet.name)

  if (petName.length > 21) {
    petName.readOffset = 21
    let name = JSON.stringify(petName.readString())
      .replace(/\\u[0-9a-f]{4}/gi, '')
      .replace(/\\[bfnr]/gi, '')
      .replace(/\"/gi, '')
      .replace('.Imo', '')
      .trim()

    return name
  }

  return "Unknown"
}

function getPetInfo (pet) {
  const petInfo = SmartBuffer.fromBuffer(pet.info).readString('utf8')
  const position = petInfo.indexOf('_Name')

  let info = petInfo.substr(position + 5, petInfo.indexOf('ThrallIcon') - position - 5).trim()
  info = JSON.stringify(info)
    .replace(/\\u[0-9a-f]{4}/gi, '')
    .replace(/\\[bfnr]/gi, '')
    .replace(/\"/gi, '')

  return info
}

function getPetOwnerId (pet) {
  const petOwner = SmartBuffer.fromBuffer(pet.owner)
  const ownerId = petOwner.readUInt16LE(petOwner.length - 8)

  return ownerId
}

module.exports = PetsController

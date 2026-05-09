const Database = require('better-sqlite3')

const queries = require('../../config/sql')

const nullValue = 'NULL'

class PlayersController {

  getAll (req, res) {
    try {
      const db = new Database(res.database.file, { readonly: true })
      const data = db.prepare(queries.players).all()
      db.close()

      data.forEach((player) => {
        if (player.char_name) player.char_name = player.char_name.slice(1, -1)
        if (player.guild_name) {
          if (player.guild_name === nullValue || !player.guild_name) {
            player.guild_name = ''
          } else {
            player.guild_name = player.guild_name.slice(1, -1)
          }
        }
        if (player.rank === nullValue || !player.rank) player.rank = ''
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

module.exports = PlayersController

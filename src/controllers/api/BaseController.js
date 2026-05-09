import Database from 'better-sqlite3'

class BaseController {

  getSql () {
    return ''
  }

  getAll (req, res) {
    try {
      const db = new Database(res.database.file, { readonly: true })
      const data = db.prepare(this.getSql()).all()
      db.close()

      data.forEach((item) => {
        item.kind = item.class || null
      })

      res.send({ data: data, update: res.database.time })
    } catch (e) {
      console.error(e)
      res.send({ error: "There was an error while querying the database" })
    }
  }

}

export default BaseController

import { join } from 'path'
import express from 'express'

const staticMiddleware = (app) => {
  const root = join(app.get('rootFolder'), 'public/assets')
  const tileOptions = {
    maxAge: '365d',
    immutable: true,
    etag: false,
    lastModified: false
  }
  app.use('/assets/tiles', express.static(join(root, 'tiles'), tileOptions))
  app.use('/assets/tiles-siptah', express.static(join(root, 'tiles-siptah'), tileOptions))
  app.use('/assets', express.static(root, { maxAge: '1d' }))
}

export default staticMiddleware

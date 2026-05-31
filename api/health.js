import { createHandler } from './_lib/handler.js'

export default createHandler(
  { methods: ['GET'], requireAuth: false, rateTier: 'general' },
  async ({ res }) => {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  }
)

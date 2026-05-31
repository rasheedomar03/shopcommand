const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info']

function formatEntry(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  // Strip sensitive fields before logging
  delete entry.password
  delete entry.token
  delete entry.secret
  delete entry.authorization
  return JSON.stringify(entry)
}

export const logger = {
  error(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.error) console.error(formatEntry('error', message, meta))
  },
  warn(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.warn) console.warn(formatEntry('warn', message, meta))
  },
  info(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.info) console.log(formatEntry('info', message, meta))
  },
  debug(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.debug) console.log(formatEntry('debug', message, meta))
  },
}

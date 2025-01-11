require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })

const PORT = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI

module.exports = {
  MONGODB_URI,
  PORT,
}
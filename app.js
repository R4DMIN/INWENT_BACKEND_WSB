require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })
const IS_TEST_ENV = process.env.NODE_ENV === 'test'

const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const crone = require('node-cron')

const { unknownEndpoint, errorHandler } = require('./utils/middleware')
const assetDataRouter = require('./controllers/assetDataController')
const locationDataRouter = require('./controllers/locationDataController')
const modelDataRouter = require('./controllers/modelsDataController')
const suppliersDataRouter = require('./controllers/suppliersDataController')
const fileUploadRouter = require('./controllers/fileUploadController')
const businessUnitsRouter = require('./controllers/businessUnitsController')
const userRouter = require('./controllers/userController')
const loginRouter = require('./controllers/loginController')
const sheduledTask = require('./utils/scheduledTask')


const app = express()

app.use(cors())
app.use(bodyParser.json({ limit: '1000kb' }))

if (!IS_TEST_ENV) app.use(morgan('[:date[iso]] MORGAN: :method :url :status - :response-time ms'))

app.use('/api/assetdata', assetDataRouter)
app.use('/api/locationdata', locationDataRouter)
app.use('/api/models', modelDataRouter)
app.use('/api/file/upload', fileUploadRouter)
app.use('/api/suppliersdata', suppliersDataRouter)
app.use('/api/businessUnit', businessUnitsRouter)
app.use('/api/login', loginRouter)
app.use('/api/users', userRouter)

app.use(errorHandler)
app.use(unknownEndpoint)

if (!IS_TEST_ENV) crone.schedule('0 * * * *', () => {
    sheduledTask.deleteExpiredTokens()
})

module.exports = app
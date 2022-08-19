// const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const cors = require('cors')
const fs = require('fs')

const poeninja = require('./services/poeninja')
const { getQueries, editQueries } = require('./services/poeApi/editQueries')
const { poeAPI } = require('./services/poeApi/poeTrade')

const app = express()
// настройка корс
const whitelist = [
  'http://localhost:3000',
  'http://31.131.100.39:3000',
  'https://poe-flip.helpless.keenetic.link',
  'http://poe-flip.helpless.keenetic.link',
  'https://letale-vc.github.io'
]
const corsOptions = {
  origin: whitelist
}
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(cors(corsOptions))
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'build')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.get('/change-queries', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.post('/ninja', async (req, res) => {
  try {
    const poeninjaReq = await poeninja()
    const dateLastUpdate = fs.statSync('ninjaData.json').mtime
    const canUpdate = Date.now() - dateLastUpdate.getTime() > 60000
    const canNextUpdate = new Date(
      Date.now() + 60000 - (Date.now() - dateLastUpdate.getTime())
    )
    res.status(200).send({
      rows: poeninjaReq,
      canUpdate,
      lastUpdate: dateLastUpdate,
      canNextUpdate
    })
  } catch (err) {
    res.status(500).send(err)
  }
})
app.post('/update', async (req, res) => {
  try {
    poeAPI()
    res.status(203).send('updated')
  } catch (err) {
    console.log(err)
    res.status(500).send(err)
  }
})
app.get('/poeQueries', async (req, res) => {
  try {
    const queries = await getQueries()
    res.status(200).send(queries)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})
app.post('/poeQueries', async (req, res) => {
  try {
    await editQueries(req.body)
    res.status(200).send('updated')
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})
app.get('/poeTrade', async (req, res) => {
  try {
    if (fs.existsSync('poeData.json')) {
      const poeTradeDataNameFile = 'poeData.json'
      const dateLastUpdate = fs.statSync(poeTradeDataNameFile).mtime
      const pathPoeTradeDataFile = path.resolve(poeTradeDataNameFile)
      const contents = await fs.promises.readFile(
        path.join(pathPoeTradeDataFile)
      )
      const canUpdate = Date.now() - dateLastUpdate.getTime() > 60000
      const canNextUpdate = new Date(
        Date.now() + 60000 - (Date.now() - dateLastUpdate.getTime())
      )
      res.status(200).send({
        rows: JSON.parse(contents),
        canUpdate,
        lastUpdate: dateLastUpdate,
        canNextUpdate
      })
      return
    }
    res.status(200).send({ message: 'Not have data', canUpdate: true })
  } catch (err) {
    res.status(500).send(err)
  }
})

app.use(function (err, req, res) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

module.exports = app

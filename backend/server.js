import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

const MONGO_URI = process.env.MONGO_URI || 
"your mongodb url goes here"

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Atlas connected"))
  .catch(err => console.error("DB ERROR:", err))

mongoose.connection.once('open', () => {
  console.log("Connected DB:", mongoose.connection.name)
})

const logSchema = new mongoose.Schema({
  textLength: { type: Number, default: 0 },
  pastedChars: { type: Number, default: 0 },
  keysPressed: { type: Number, default: 0 },
  pasteEvents: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
})

const Log = mongoose.model('Log', logSchema, 'caseStudies')

app.get('/test', (req, res) => {
  res.send("OK Server working")
})

app.post('/save-log', async (req, res) => {
  console.log("ROUTE HIT")
  console.log("DATA RECEIVED:", req.body)

  try {
    const newLog = new Log({
      textLength: req.body.textLength || 0,
      pastedChars: req.body.charsPasted || 0,
      keysPressed: req.body.keysPressed || 0,
      pasteEvents: req.body.pasteEvents || []
    })

    const saved = await newLog.save()

    console.log("SAVED TO DB:", saved)

    res.json({
      success: true,
      message: "Data saved successfully",
      data: saved
    })
  } catch (err) {
    console.error("SAVE ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 })
    res.json(logs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000")
})
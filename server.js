import express from 'express'
import mongoose from 'mongoose'
import Cors from 'cors'
import dotenv from 'dotenv'
import Messages from './models/messageModel.js';
import Pusher from 'pusher';
//App Config
dotenv.config();
const app = express()
const port = process.env.PORT || 8000 ;
const pusher = new Pusher({
    appId: "1823563",
    key: "fb1297ede3c06e92dd12",
    secret: "8a4920008e50497bff28",
    cluster: "ap2",
    useTLS: true
  });
//DB Config
(async () => {
    try{
        const connect = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${connect.connection.host}`)
    } catch (err) {
        console.log(err)
        process.exit(1)
    }
})();
//Middleware
app.use(express.json())
app.use(Cors())
//API Endpoints
const db = mongoose.connection
db.once("open", () => {
    console.log("DB Connected")
    const msgCollection = db.collection("messages")
    const changeStream = msgCollection.watch()
    changeStream.on('change', change => {
        if(change.operationType === "insert") {
            const messageDetails = change.fullDocument
            pusher.trigger("messages", "inserted", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received
                })
        } else {
            console.log('Error trigerring Pusher')
        }
    })
})
app.get("/", (req, res) => res.status(200).send("Hello TheWebDev"))
app.post('/messages/new', async (req, res) => {
    let message = req.body
    await Messages.create(message)
    res.status(201).send(message)
})
app.get('/messages/sync', async (req, res) => {
    let messages = await Messages.find()
    res.status(200).send(messages)
})
//Listener
app.listen(port, () => console.log(`Listening on localhost: ${port}`))

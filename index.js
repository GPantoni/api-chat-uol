import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(json());
server.use(cors());

async function mongoConnect() {
  const mongoClient = new MongoClient(process.env.MONGO_URI);
  try {
    await mongoClient.connect();
    const db = mongoClient.db("chatBase");
    return { mongoClient, db };
  } catch (error) {
    console.error(error);
  }
}

const nameSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.alternatives().valid("message", "private_message").required(),
});

server.post("/participants", async (req, res) => {
  const participant = req.body;
  const validation = nameSchema.validate(participant);
  if (validation.error) {
    res.status(422).send(validation.error.details);
    return;
  }

  const { mongoClient, db } = await mongoConnect();

  try {
    const usersCollection = db.collection("users");
    const notAvailableName = await usersCollection.findOne({
      name: participant.name,
    });

    if (notAvailableName) {
      res.sendStatus(409);
      return;
    }

    await usersCollection.insertOne({ ...participant, lastStatus: Date.now() });

    const messagesCollection = db.collection("messages");
    await messagesCollection.insertOne({
      from: participant.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:MM:SS"),
    });
    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.get("/participants", async (req, res) => {
  const { mongoClient, db } = await mongoConnect();

  try {
    const participants = await db.collection("users").find({}).toArray();
    res.send(participants);
    mongoClient.close();
  } catch (error) {
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.post("/messages", (req, res) => {});

server.get("/messages", (req, res) => {});

server.delete("/messages/:id", (req, res) => {});

server.put("messages/:id", (req, res) => {});

server.post("/status", async (req, res) => {
  const { mongoClient, db } = await mongoConnect();

  const { user } = req.headers;

  try {
    const isAnUser = await db.collection("users").findOne({ name: user });
    if (!isAnUser) {
      res.sendStatus(404);
      mongoClient.close();
      return;
    }

    await db
      .collection("users")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

    res.sendStatus(200);
    mongoClient.close();
  } catch (error) {
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.listen(5000);

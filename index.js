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
  from: joi.string(),
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
      mongoClient.close();
      return;
    }

    await usersCollection.insertOne({ ...participant, lastStatus: Date.now() });

    const messagesCollection = db.collection("messages");
    await messagesCollection.insertOne({
      from: participant.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("hh:mm:ss"),
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

server.post("/messages", async (req, res) => {
  const { mongoClient, db } = await mongoConnect();

  const from = req.headers.user;
  const message = { ...req.body, from };
  const validation = messageSchema.validate(message, { abortEarly: false });
  const fromIsAnUser = await db
    .collection("users")
    .findOne({ name: new ObjectId(from) });
  if (validation.error || !fromIsAnUser) {
    res.status(422);
    mongoClient.close();
    return;
  }

  try {
    message = { ...message, time: dayjs().format("HH:MM:SS") };
    const messagesCollection = db.collection("messages");
    await messagesCollection.insertOne({ message });
    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.get("/messages", async (req, res) => {
  const { mongoClient, db } = await mongoConnect();

  const { user } = req.headers;

  const limit = parseInt(req.query.limit);

  try {
    const userMessages = await db
      .collection("messages")
      .find({
        $or: [{ to: "Todos" }, { from: user }, { to: user }],
      })
      .toArray();

    if (userMessages.length > limit) {
      const limitedUserMessages = userMessages.slice(-limit);
      res.send(limitedUserMessages);
      mongoClient.close();
      return;
    }

    res.send(userMessages);
    mongoClient.close();
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
    mongoClient.close();
  }
});

server.delete("/messages/:id", async (req, res) => {
  const { mongoClient, db } = mongoConnect();

  const { user } = req.headers;

  const { id } = req.params;

  try {
    const messageExists = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });

    if (!messageExists) {
      res.sendStatus(404);
      mongoClient.close();
      return;
    }

    if (user !== messageExists.from) {
      res.sendStatus(401);
      mongoClient.close();
      return;
    }

    await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(200);
    mongoClient.close();
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
    mongoClient.close();
  }
});

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

setInterval(async () => {
  const { mongoClient, db } = await mongoConnect();

  const participants = await db.collection("users").find().toArray();

  try {
    participants.forEach(async (p) => {
      if (p.lastStatus < Date.now() - 10000) {
        await db.collection("messages").insertOne({
          from: p.name,
          to: "Todos",
          text: "Sai da sala...",
          type: "status",
          time: dayjs(Date.now()).format("hh:mm:ss"),
        });

        await db.collection("users").deleteOne({ _id: p._id });
      }

      mongoClient.close();
    });
  } catch (error) {
    console.error(error);
    mongoClient.close();
  }
}, 15000);

server.listen(5000);

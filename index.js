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

server.post("/participants", (req, res) => {});

server.get("/participants", (req, res) => {});

server.post("/messages", (req, res) => {});

server.get("/messages", (req, res) => {});

server.delete("/messages/:id", (req, res) => {});

server.put("messages/:id", (req, res) => {});

server.post("/status", (req, res) => {});

server.listen(5000);

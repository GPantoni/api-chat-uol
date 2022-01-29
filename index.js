import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(json);
server.use(cors);

server.post("/participants", (req, res) => {});

server.get("/participants", (req, res) => {});

server.post("/messages", (req, res) => {});

server.get("/messages", (req, res) => {});

server.delete("/messages/:id", (req, res) => {});

server.put("messages/:id", (req, res) => {});

server.post("/status", (req, res) => {});

server.listen(5000);

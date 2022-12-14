"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require("../config");

describe("Message Routes Test", function () {
  let u1;
  let u2;
  let m1;
  let m2;
  let token;

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    u1 = await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });

    u2 = await User.register({
      username: "test2",
      password: "password",
      first_name: "Test2",
      last_name: "Testy2",
      phone: "+14155550001",
    });

    m1 = await Message.create({
      from_username: u1.username,
      to_username: u2.username,
      body: "Hello",
    });

    m2 = await Message.create({
      from_username: u2.username,
      to_username: u1.username,
      body: "Yo",
    });

    token = jwt.sign({ username: u1.username }, SECRET_KEY);
  });

  describe("GET /messages/:id", function () {
    test("can get message", async function () {
      const resp = await request(app)
        .get(`/messages/${m1.id}`)
        .query({ _token: token });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.message).toEqual({
        id: expect.any(Number),
        body: "Hello",
        sent_at: expect.any(String),
        read_at: null,
        from_user: {
          username: u1.username,
          first_name: u1.first_name,
          last_name: u1.last_name,
          phone: u1.phone,
        },
        to_user: {
          username: u2.username,
          first_name: u2.first_name,
          last_name: u2.last_name,
          phone: u2.phone,
        },
      });
    });

    test("won't get message if not authenticated", async function () {
      const resp = await request(app).get(`/messages/${m1.id}`);

      expect(resp.statusCode).toEqual(401);
    });

    test("won't get message with forged token", async function () {
      const resp = await request(app)
        .get(`/messages/${m1.id}`)
        .query({ _token: "FAKE" });

      expect(resp.statusCode).toEqual(401);
    });

    test("Won't get message for non-existing message", async function () {
      const resp = await request(app)
        .get(`/messages/123454326`)
        .query({ _token: token });

      expect(resp.statusCode).toEqual(404);
    });
  });

  describe("POST /messages", function () {
    test("Can post message", async function () {
      const resp = await request(app).post("/messages").send({
        to_username: u2.username,
        body: "TEST POST",
        from_username: u1.username,
        _token: token,
      });

      expect(resp.statusCode).toEqual(201);
      expect(resp.body.message).toEqual({
        id: expect.any(Number),
        from_username: u1.username,
        to_username: u2.username,
        body: "TEST POST",
        sent_at: expect.any(String),
      });
    });

    test("Won't post message if no/bad token/no body", async function () {
      const resp1 = await request(app).post("/messages").send({
        to_username: u2.username,
        body: "TEST POST",
        from_username: u1.username,
      });

      expect(resp1.statusCode).toEqual(401);

      const resp2 = await request(app).post("/messages").send({
        to_username: u2.username,
        body: "TEST POST",
        from_username: u1.username,
        _token: "BAD TOKEN",
      });

      expect(resp2.statusCode).toEqual(401);

      const resp3 = await request(app).post("/messages").query({
        _token: token,
      });

      expect(resp3.statusCode).toEqual(400);
    });
  });

  describe("POST /messages/:id/read", function () {
    test("Can mark message as read", async function () {
      const resp = await request(app).post(`/messages/${m2.id}/read`).query({
        _token: token,
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.message.read_at).toEqual(expect.any(String));
    });

    test("Won't mark message as read if sender views message", async function () {
      const resp = await request(app).post(`/messages/${m1.id}/read`).query({
        _token: token,
      });

      expect(resp.statusCode).toEqual(401);
    });

    test("Won't mark message if message doesn't exist", async function () {
      const resp = await request(app).post(`/messages/1234436/read`).query({
        _token: token,
      });

      expect(resp.statusCode).toEqual(404);
    });
  });
});

afterAll(async function () {
  await db.end();
});

"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require("../config");

describe("Users Routes Test", function () {
  let u1;
  let u2;
  let m1;
  let m2;
  let u1Token;
  let u2Token;

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

    u1Token = jwt.sign({ username: u1.username }, SECRET_KEY);
    u2Token = jwt.sign({ username: u2.username }, SECRET_KEY);
  });

  describe("GET /users/", function () {
    test("Get all users", async function () {
      const resp = await request(app).get("/users").query({ _token: u1Token });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.users.length).toEqual(2);
      expect(resp.body.users).toEqual(
        [{username: "test1", first_name: "Test1", last_name: "Testy1"},
         {username: "test2", first_name: "Test2", last_name: "Testy2"}]
      );
    });

    test("Won't get all users if not logged in", async function () {
      const resp = await request(app).get("/users").query({});

      expect(resp.statusCode).toEqual(401);
    });
  });

  describe("GET /users/:username", function () {
    test("Get user detail", async function () {
      const resp = await request(app)
        .get(`/users/${u1.username}`)
        .query({ _token: u1Token });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.user).toEqual({
        username: "test1",
        first_name: "Test1",
        last_name: "Testy1",
        phone: "+14155550000",
        join_at: expect.any(String),
        last_login_at: expect.any(String),
      });
    });

    test("Won't get user detail if not logged in", async function () {
      const resp = await request(app).get(`/users/${u1.username}`);

      expect(resp.statusCode).toEqual(401);
    });

    test("Won't get user detail if user does not exist", async function () {
      const resp = await request(app)
        .get("/users/FAKEUSER")
        .query({ _token: u1Token });

      expect(resp.statusCode).toEqual(401);
    })
  });

  describe("GET /users/:username/to", function () {
    test("Get messages to a user", async function () {
      const resp = await request(app)
        .get(`/users/${u1.username}/to`)
        .send({ _token: u1Token });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.messages.length).toEqual(1);
      expect(resp.body.messages).toEqual([
        {id: expect.any(Number),
         body: "Yo",
         sent_at: expect.any(String),
         read_at: null,
         from_user: {
          username: u2.username,
          first_name: "Test2",
          last_name: "Testy2",
          phone: "+14155550001"
        }}]);
    });

    test(`Won't get messages to user not the recipient`, async function () {
      const resp = await request(app)
        .get(`/users/${u1.username}/to`)
        .send({ _token: u2Token }); // Wrong auth

      expect(resp.statusCode).toEqual(401);
    });

    test(`Won't get messages to user if not logged in`, async function () {
      const resp = await request(app).get(`/users/${u1.username}/to`);

      expect(resp.statusCode).toEqual(401);
    });

    test("Won't get messages if user does not exist", async function () {
      const resp = await request(app)
        .get("/users/FAKEUSER/to")
        .query({ _token: u1Token });

      expect(resp.statusCode).toEqual(401);
    })
  });

  describe("GET /users/:username/from", function () {
    test("Get messages from a user", async function () {
      const resp = await request(app)
        .get(`/users/${u1.username}/from`)
        .send({ _token: u1Token });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.messages.length).toEqual(1);
      expect(resp.body.messages).toEqual([
        {id: expect.any(Number),
         body: "Hello",
         sent_at: expect.any(String),
         read_at: null,
         to_user: {
          username: u2.username,
          first_name: "Test2",
          last_name: "Testy2",
          phone: "+14155550001"
        }}]);
    })

    test("Won't get messages from user if not correct user", async function () {
      const resp = await request(app)
        .get(`/users/${u1.username}/from`)
        .send({ _token: u2Token }); // Wrong auth

      expect(resp.statusCode).toEqual(401);
    });

    test("Won't get messages from user if not logged in", async function () {
      const resp = await request(app).get(`/users/${u1.username}/from`);

      expect(resp.statusCode).toEqual(401);
    })

    test("Won't get user detail if user does not exist", async function () {
      const resp = await request(app)
        .get("/users/FAKEUSER/from")
        .query({ _token: u1Token });

      expect(resp.statusCode).toEqual(401);
    })
  });
});

afterAll(async function () {
  await db.end();
});

"use strict";

const Router = require("express").Router;
const router = new Router();
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, BadRequestError } = require("../expressError");
const User = require("../models/user");

/** POST /login: {username, password} => {token} */
router.post("/login", async function (req, res) {
  if (req.body === undefined) throw new BadRequestError();

  const { username, password } = req.body;

  if ((await User.authenticate(username, password)) === true) {
    await User.updateLoginTimestamp(username);
    const token = jwt.sign({ username }, SECRET_KEY);
    return res.json({ token });
  }

  throw new UnauthorizedError("You must be logged in to do that.");
});

/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */
router.post("/register", async function (req, res) {
  if (req.body === undefined) throw new BadRequestError();
  try {
    const user = await User.register(req.body);
    const token = jwt.sign({ username: user.username }, SECRET_KEY);
    return res.json({ token });
  } catch (err) {
    throw err;
  }
});

module.exports = router;

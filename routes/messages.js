"use strict";

const Router = require("express").Router;
const router = new Router();
const { UnauthorizedError, BadRequestError } = require("../expressError");
const { ensureLoggedIn } = require("../middleware/auth");
const Message = require("../models/message");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Makes sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function (req, res) {
  const message = await Message.get(req.params.id);

  if (
    res.locals.user &&
    message &&
    (message.from_user.username === res.locals.user.username ||
      message.to_user.username === res.locals.user.username)
  ) {
    return res.json({ message });
  }

  throw new UnauthorizedError();
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async function (req, res) {
  if (req.body === undefined) throw new BadRequestError();

  const message = await Message.create({
    ...req.body,
    from_username: res.locals.user.username,
  });

  return res.json({ message });
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Makes sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", async function (req, res) {
  if (req.body === undefined) throw new BadRequestError();

  const foundMessage = await Message.get(req.params.id);

  if (
    res.locals.user &&
    foundMessage &&
    foundMessage.to_user.username === res.locals.user.username
  ) {
    const message = await Message.markRead(req.params.id);
    return res.json({ message });
  }

  throw new UnauthorizedError();
});

module.exports = router;

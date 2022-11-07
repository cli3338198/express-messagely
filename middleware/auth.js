"use strict";

/** Middleware for handling req authorization for routes. */

const jwt = require("jsonwebtoken");

const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");
// const Message = require("../models/message");

/** Middleware: Authenticate user. */

function authenticateJWT(req, res, next) {
  try {
    const tokenFromRequest = req.query._token || req.body._token;
    const payload = jwt.verify(tokenFromRequest, SECRET_KEY);
    res.locals.user = payload;
    return next();
  } catch (err) {
    // error in this middleware isn't error -- continue on
    return next();
  }
}

/** Middleware: Requires user is authenticated. */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) {
      throw new UnauthorizedError();
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Requires user is user for route. */

function ensureCorrectUser(req, res, next) {
  try {
    if (!res.locals.user || res.locals.user.username !== req.params.username) {
      throw new UnauthorizedError();
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Check that sender or recipient is the current user. */

// function ensureUserIsSenderOrRecipient(req, res, next) {
//   const { id } = req.params;

//   try {
//     const message = Message.get(id);
//     if (
//       res.locals.user &&
//       (message.from_username === res.locals.user ||
//         message.to_username === res.locals.user)
//     ) {
//       res.locals.message = message;
//     }
//     return next();
//   } catch (err) {
//     return next(err);
//   }
// }

/** Middleware: Check that user is the recipient. */

// function ensureUserIsRecipient(req, res, next) {
//   const { id } = req.params;

//   try {
//     const message = Message.get(id);
//     if (message.from_username === res.locals.user) {
//       res.locals.message = message;
//     }
//     return next();
//   } catch (err) {
//     return next(err);
//   }
// }

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
  // ensureUserIsSenderOrRecipient,
  // ensureUserIsRecipient,
};

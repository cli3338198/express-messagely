"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `
      INSERT INTO users
      (username, password, first_name, last_name, phone)
      VALUES($1, $2, $3, $3, $5)
      RETURNING username, password, first_name, last_name, phone
    `,
      [username, hashedPassword, first_name, last_name, phone]
    );

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `
      SELECT u.username, u.password
      FROM users AS u
      WHERE u.username = $1
      RETURNING u.password
    `,
      [username]
    );
    const user = result.rows[0];

    if (user) {
      if ((await bcrypt.compare(password, user.password)) === true) {
        return true;
      } else {
        throw new UnauthorizedError("Invalid password.");
      }
    }

    throw new NotFoundError("User does not exist.");
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `
      UPDATE users
      SET last_login_at = $1
      WHERE username = $2
      RETURNING username
      `,
      [Date.now(), username]
    )

    const user = result.rows[0];

    if(!user) throw new NotFoundError("User does not exist.");
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `
      SELECT username, first_name, last_name
      FROM users
      `
    )

    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `
      SELECT
        username,
        first_name,
        last_name,
        phone,
        join_at,
        last_login_at
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    const user = result.rows[0];

    if(!user) throw new NotFoundError("User does not exist.");

    return user
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `
      SELECT
        m.id,
        m.to_username,
        m.body,
        m.sent_at,
        m.read_at,
        u.first_name,
        u.last_name,
        u.phone
      FROM messages AS m
        JOIN users AS u ON m.to_username = u.username
      WHERE m.from_username = $1
      `,
      [username]
    );

    return result.rows.map(m => ({
      id: m.id,
      to_user: {
        username: m.to_username,
        first_name: m.to_first_name,
        last_name: m.to_last_name,
        phone: m.to_phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {}
}

module.exports = User;

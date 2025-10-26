// db.js
require("dotenv").config();
const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30000,
});

db.on("error", (err) => {
  console.error("PG Pool error:", err);
});

module.exports = db;

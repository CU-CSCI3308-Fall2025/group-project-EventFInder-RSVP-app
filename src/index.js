// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

require("dotenv").config(); // Load environment variables from .env file

const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars");
const Handlebars = require("handlebars");
const path = require("path");
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios"); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
});

// database configuration
const dbConfig = {
  host: "db", // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  }),
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});

<<<<<<< HEAD
app.get("/feed", async (req, res) => {
  // TODO handle authentication
  const { includeApi, includeLocal } = req.query;

  const result = [];
  if (includeApi) {
    // Make api call later
  }
  if (includeLocal ?? true) {
    try {
      const events = await db.any("SELECT * FROM custom_events");
      result.push(...events);
    } catch (e) {
      console.log("ERROR:", e.message || e);
      // TODO make error page
      res.status(500).send("Internal Server Error");
    }
  }

  console.log("Events:", result);
  return res.render("pages/feed.hbs", { events: result });
});

app.listen(3000);
=======
module.exports = app.listen(3000);
>>>>>>> 288e9c0 (Added base test case)
console.log("Server is listening on port 3000");

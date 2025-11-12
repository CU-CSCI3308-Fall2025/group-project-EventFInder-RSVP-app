// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************
import sqlite3 from "sqlite3";
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
app.get("/", (req, res) => {
  return res.render('', { layout: 'main' });
});
app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});
app.get("/rsvp", async (req, res) => {
  try {
    // Fetch event info from API 
    //const response = await fetch("http://localhost:3000/api/events/1");/ex route
    //const eventData = await response.json();
    /*return res.render("pages/RSVP", {
      eventName: eventData.event_name,
      eventDate: eventData.event_date,
      eventLocation: eventData.event_location,
    });
    */
   //test data
   return res.render("pages/RSVP", {eventName: "Annual Company Picnic", eventDate: "June 14, 2026", eventLocation: "City Park, Denver"})
  } catch (err) {
    console.error("Error fetching event data:", err);
    return res.status(500).send("Error loading event details");
  }
});

app.post("/api/rsvp", async (req, res) => {
  try {
    const { name, email, guests, notes } = req.body;

    // Insert into your RSVP table (create it if it doesn’t exist)
    await db.none(
      `INSERT INTO rsvps (name, email, guests, notes)
       VALUES ($1, $2, $3, $4)`,
      [name, email, guests, notes]
    );

    res.json({ message: "RSVP saved successfully" });
  } catch (error) {
    console.error("Error saving RSVP:", error);
    res.status(500).json({ message: "Database error" });
  }
});


app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (
      !name ||
      !email ||
      !password ||
      email.length < 1 ||
      password.length < 1 ||
      name.length < 1
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Email and password are required" });
    }
    // check regex for email
    if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid email address" });
    }

    // check password length
    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long",
      });
    }

    // check if email already exists in database
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user) {
      return res
        .status(400)
        .json({ status: "error", message: "Email already exists" });
    }

    // hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create new user in database with hashed password
    await db.none(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword],
    );
    res.status(201).json({ status: "success", message: "User created" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

module.exports = app.listen(3000);
console.log("Server is listening on port 3000");

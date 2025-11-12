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


/// GET /register
app.get("/register", (req, res) => {
  res.render("pages/Register", { title: "Register" });
});

// POST /register
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.none("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [
      name,
      email,
      hashedPassword,
    ]);
    res.redirect("/login");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("pages/Register", {
      title: "Register",
      message: "Registration failed. Try a different email.",
      error: true,
    });
  }
});

// GET /login
app.get("/login", (req, res) => {
  res.render("pages/Login", { title: "Login" });
});

// POST /login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("pages/Login", {
        title: "Login",
        message: "Invalid email or password.",
        error: true,
      });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.redirect("/profile");
  } catch (err) {
    console.error("Login error:", err);
    res.render("pages/Login", {
      title: "Login",
      message: "An error occurred during login.",
      error: true,
    });
  }
});


module.exports = app.listen(3000);
console.log("Server is listening on port 3000");

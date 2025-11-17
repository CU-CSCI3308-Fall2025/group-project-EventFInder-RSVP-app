// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************
//import sqlite3 from "sqlite3";
require("dotenv").config(); // Load environment variables from .env file

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
  helpers: {
    eq: function (a, b) {
      return a === b;
    },
  },
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

app.use("/pages", express.static(path.join(__dirname, "views/pages")));

app.get("/", (req, res) => {
  return res.render("pages/Login", { layout: "main" }); // should we put the login or register page here?
});
app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});
app.get("/rsvp", async (req, res) => {
  try {
    const { eventName, eventDate, eventLocation } = req.query;
    const context = {
      //use defaults if no data passed through
      eventName: eventName || "Default Event",
      eventDate: eventDate || "Default Date",
      eventLocation: eventLocation || "Default Location"
    };
    return res.render("pages/RSVP", context);
  } catch (err) {
    console.error("Error loading event details:", err);
    return res.status(500).send("Error loading event details");
  }
});

app.post("/submit-rsvp", async (req, res) => {
  try {
    const { name, email, guests, notes } = req.body;
    const guestCount = parseInt(guests, 10) || 1;
    await db.none(`
      CREATE TABLE IF NOT EXISTS rsvps (
        rsvp_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        guests INTEGER DEFAULT 1 CHECK (guests > 0),
        notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.none(
      `INSERT INTO rsvps (name, email, guests, notes)
       VALUES ($1, $2, $3, $4);`,
      [name, email, guestCount, notes]
    );
    res.json({ message: "✅ RSVP saved successfully" });
  } catch (error) {
    console.error("❌ Error saving RSVP:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});


/// GET /register
app.get("/register", (req, res) => {
  res.render("pages/Register", { title: "Register" });
});

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
  /*  // Ensure users table exists
  db.none(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
    .then(() => console.log("Users table ready"))
    .catch((err) => console.error("Users table error:", err));
*/
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      return res.render('pages/Register', {
        message: 'Invalid or missing email format.',
        error: true,
      });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert name, email, and hashed password into the 'users' table
    await db.none(
      'INSERT INTO users(name, email, password) VALUES($1, $2, $3)',
      [name, email, hashedPassword]
    );

    // Redirect to Login page after successful registration
    res.redirect('/Login');

  } catch (err) {
    console.error('Error during registration:', err);

    // If an error occurs (e.g., duplicate email), re-render the Register page with a message
    res.render('pages/Register', {
      message: 'Registration failed. Email may already exist.',
      error: true,
    });
  }
}); 

// *****************************************************
// JSON API VERSION FOR TESTS ONLY
// *****************************************************

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Name required
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email address",
      });
    }

    // Password length check
    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users
    await db.none(
      "INSERT INTO users(name, email, password) VALUES($1, $2, $3)",
      [name, email, hashedPassword]
    );

    return res.status(201).json({
      status: "success",
      message: "User created",
    });

  } catch (err) {
    console.error("API register error:", err);

    return res.status(500).json({
      status: "error",
      message: "Server error",
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
    res.redirect("/feed");
  } catch (err) {
    console.error("Login error:", err);
    res.render("pages/Login", {
      title: "Login",
      message: "An error occurred during login.",
      error: true,
    });
  }
});


app.get("/feed", async (req, res) => {
  // Check for authentication
   if (!req.session.user) {
     return res.redirect("/login");
   }

  const { includeApi, includeLocal, searchQuery, sortBy } = req.query;

  // Determine what to include based on parameters
  const shouldIncludeApi =
    includeApi === "true" && searchQuery && searchQuery.trim().length > 0;
  const shouldIncludeLocal =
    includeLocal === "true" || (!includeApi && !searchQuery);

  const result = [];
  if (shouldIncludeApi) {
    try {
      const response = await axios({
        url: `https://app.ticketmaster.com/discovery/v2/events.json`,
        method: "GET",
        dataType: "json",
        headers: {
          "Accept-Encoding": "application/json",
        },
        params: {
          apikey: process.env.API_KEY,
          keyword: searchQuery.trim(),
          size: 10, // Number of events to return
        },
      });

      // Check if we have events
      const apiEvents = response.data._embedded
        ? response.data._embedded.events
        : [];

      // Transform API events to match our database schema
      const transformedEvents = apiEvents.map((event) => {
        // Extract venue information
        const venue = event._embedded?.venues?.[0];
        const location = venue
          ? `${venue.name}, ${venue.city?.name || ""}, ${venue.state?.stateCode || venue.country?.countryCode || ""}`
              .replace(/,\s*,/g, ",")
              .replace(/,\s*$/, "")
          : "Location TBA";

        // Create description from available info
        let description = event.info || event.pleaseNote || "";
        if (!description && event.classifications?.[0]) {
          const classification = event.classifications[0];
          description = `${classification.segment?.name || "Event"} - ${classification.genre?.name || ""}`;
        }
        if (!description) {
          description = "No description available";
        }

        // Parse start time
        const startTime = event.dates?.start?.dateTime
          ? new Date(event.dates.start.dateTime).toISOString()
          : new Date().toISOString();

        // Estimate end time (add 3 hours if not provided)
        let endTime;
        if (event.dates?.end?.dateTime) {
          endTime = new Date(event.dates.end.dateTime).toISOString();
        } else {
          const startDate = new Date(startTime);
          startDate.setHours(startDate.getHours() + 3);
          endTime = startDate.toISOString();
        }

        return {
          id: `api_${event.id}`, // Prefix to distinguish from DB events
          title: event.name || "Untitled Event",
          description: description.substring(0, 500), // Limit description length
          location: location,
          start_time: startTime,
          end_time: endTime,
          organizer_id: null, // API events don't have local organizers
          created_at: new Date().toISOString(),
          source: "ticketmaster",
          external_url: event.url || "",
          external_id: event.id,
        };
      });

      result.push(...transformedEvents);
    } catch (error) {
      console.error("Ticketmaster API Error:", error.message);
      // Continue with local events even if API fails
    }
  }
  if (shouldIncludeLocal) {
    try {
      let query = "SELECT * FROM custom_events";
      let params = [];

      // Add search functionality for local events
      if (searchQuery && searchQuery.trim().length > 0) {
        query +=
          " WHERE title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1";
        params.push(`%${searchQuery.trim()}%`);
      }

      // Add sorting for local events
      if (sortBy === "name") {
        query += " ORDER BY title ASC";
      } else {
        query += " ORDER BY start_time ASC";
      }

      const events = await db.any(query, params);
      result.push(...events);
    } catch (e) {
      console.log("ERROR:", e.message || e);
      // TODO make error page
      res.status(500).send("Internal Server Error");
    }
  }

  // Sort the combined results if needed
  if (sortBy === "name") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default sort by date (start_time)
    result.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }

  console.log("Events:", result);
  return res.render("pages/feed.hbs", {
    events: result,
    searchQuery: searchQuery || "",
    includeApi: shouldIncludeApi,
    includeLocal: shouldIncludeLocal,
    sortBy: sortBy || "date",
  });
});


app.get("/api/me", async (req, res) => {
  try {
    // Check that the user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // Query only the username for this user
    const user = await db.oneOrNone(
      "SELECT username FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return just the username as JSON
    res.json({ username: user.username });
  } catch (err) {
    console.error("GET /api/me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
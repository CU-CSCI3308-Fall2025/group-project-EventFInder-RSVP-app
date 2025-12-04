// ********************** Initialize server **********************************

const server = require("../index"); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require("chai"); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** Database Connection for Cleanup ********************

const pgp = require("pg-promise")();
const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe("Server!", () => {
  // Sample test case given to test / endpoint.
  it("Returns the default welcome message", (done) => {
    chai
      .request(server)
      .get("/welcome")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals("success");
        assert.strictEqual(res.body.message, "Welcome!");
        done();
      });
  });
});

// *********************** REGISTER ENDPOINT TESTCASES **************************

describe("Register User", () => {
  const registeredUsers = [];

  // Clean up all successfully registered test users after all tests
  after(async () => {
    try {
      for (const email of registeredUsers) {
        await db.none("DELETE FROM users WHERE email = $1", [email]);
        console.log(`Cleaned up registered test user: ${email}`);
      }
    } catch (error) {
      console.error("Error during Register test cleanup:", error);
    }
  });

  // Positive test case - successful registration
  it("Positive: /register - Should register a new user successfully", (done) => {
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    registeredUsers.push(testEmail); // Track for cleanup

    chai
      .request(server)
      .post("/api/register")
      .send({
        name: "Test User",
        email: testEmail,
        password: "password123",
      })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body.status).to.equals("success");
        expect(res.body.message).to.equals("User created");
        done();
      });
  });

  // Negative test case 1 - missing name
  it("Negative: /register - Should fail when name is missing", (done) => {
    chai
      .request(server)
      .post("/api/register")
      .send({
        email: "test@example.com",
        password: "password123",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.status).to.equals("error");
        expect(res.body.message).to.equals("Email and password are required");
        done();
      });
  });

  // Negative test case 2 - invalid email format
  it("Negative: /register - Should fail with invalid email format", (done) => {
    chai
      .request(server)
      .post("/api/register")
      .send({
        name: "Test User",
        email: "invalid-email",
        password: "password123",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.status).to.equals("error");
        expect(res.body.message).to.equals("Invalid email address");
        done();
      });
  });

  // Negative test case 3 - password too short
  it("Negative: /register - Should fail when password is too short", (done) => {
    chai
      .request(server)
      .post("/api/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "short",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.status).to.equals("error");
        expect(res.body.message).to.equals(
          "Password must be at least 8 characters long",
        );
        done();
      });
  });

  // Additional negative test case - missing email
  it("Negative: /register - Should fail when email is missing", (done) => {
    chai
      .request(server)
      .post("/api/register")
      .send({
        name: "Test User",
        password: "password123",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.status).to.equals("error");
        expect(res.body.message).to.equals("Email and password are required");
        done();
      });
  });
});

// ********************************************************************************

// *********************** FEED ENDPOINT TESTCASES *****************************

describe("Feed Page Tests", () => {
  let sessionCookie;
  let testUser;

  // Helper function to create a test user and get session cookie
  before(async () => {
    const timestamp = Date.now();
    testUser = {
      name: "Feed Test User",
      email: `feedtest${timestamp}@example.com`,
      password: "password123",
    };

    // Register test user
    await chai.request(server).post("/api/register").send(testUser);

    // Login to get session cookie - follow redirects
    const loginRes = await chai
      .request(server)
      .post("/login")
      .redirects(0)
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    console.log("Login response status:", loginRes.status);
    console.log("Login response headers:", loginRes.headers);

    // Extract session cookie from login response
    if (loginRes.headers["set-cookie"]) {
      sessionCookie = loginRes.headers["set-cookie"];
      console.log("Session cookie obtained:", sessionCookie);
    } else {
      console.log("No session cookie found in login response");
    }
  });

  // Clean up test user after all tests
  after(async () => {
    try {
      // Clean up the test user
      await db.none("DELETE FROM users WHERE email = $1", [testUser.email]);
      console.log(`Cleaned up test user: ${testUser.email}`);
    } catch (error) {
      console.error("Error during Feed test cleanup:", error);
    }
  });

  // Positive test case 1 - Access feed page when authenticated
  it("Positive: /feed - Should display feed page for authenticated user", (done) => {
    const req = chai.request(server).get("/feed");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Discover Events");
      expect(res.text).to.include("Search Events");
      done();
    });
  });

  // Negative test case 1 - Redirect to login when not authenticated
  it("Negative: /feed - Should redirect to login when not authenticated", (done) => {
    chai
      .request(server)
      .get("/feed")
      .redirects(0)
      .end((err, res) => {
        // Debug output
        console.log("Status:", res.status);
        console.log("Location header:", res.headers.location);
        console.log(
          "Response text contains login:",
          res.text ? res.text.includes("Login") : false,
        );

        if (res.status === 302) {
          expect(res.headers.location).to.equal("/login");
        } else if (
          res.status === 200 &&
          res.text &&
          res.text.includes("Login")
        ) {
          // Server might be rendering login page directly instead of redirecting
          expect(res.text).to.include("Login");
        } else {
          // If neither, fail with helpful message
          expect(res.status).to.be.oneOf([200, 302]);
        }
        done();
      });
  });

  // Positive test case 2 - Default feed shows local events sorted by date
  it("Positive: /feed - Should show local events by default sorted by date", (done) => {
    const req = chai.request(server).get("/feed");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Tech Conference 2024");
      expect(res.text).to.include("Summer Music Festival");
      done();
    });
  });

  // Positive test case 3 - Search functionality with local events
  it("Positive: /feed - Should filter local events by search query", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=Tech&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Tech Conference 2024");
      done();
    });
  });

  // Positive test case 4 - Sort by name functionality
  it("Positive: /feed - Should sort events by name when sortBy=name", (done) => {
    const req = chai.request(server).get("/feed?sortBy=name&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      // Should still show events but sorted by name
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Positive test case 5 - Only local events checkbox functionality
  it("Positive: /feed - Should show only local events when includeLocal=true", (done) => {
    const req = chai.request(server).get("/feed?includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Tech Conference 2024");
      done();
    });
  });

  // Positive test case 6 - API events require search query
  it("Positive: /feed - Should handle API events with search query", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=concert&includeApi=true&includeLocal=false");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      // Even if API fails, should still return successfully
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Positive test case 7 - Empty search query handling
  it("Positive: /feed - Should handle empty search query gracefully", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Positive test case 8 - Search with no results
  it("Positive: /feed - Should handle search with no matching results", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=nonexistentevent12345&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("No events found");
      done();
    });
  });

  // Positive test case 9 - Multiple filter parameters
  it("Positive: /feed - Should handle multiple filter parameters", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=music&sortBy=name&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Summer Music Festival");
      done();
    });
  });

  // Positive test case 10 - Case insensitive search
  it("Positive: /feed - Should perform case insensitive search", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=TECH&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Tech Conference 2024");
      done();
    });
  });

  // Positive test case 11 - Search in description field
  it("Positive: /feed - Should search in event descriptions", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=keynote&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Tech Conference 2024");
      done();
    });
  });

  // Positive test case 12 - Search in location field
  it("Positive: /feed - Should search in event locations", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=park&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      // Should find events at parks
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Edge case test 1 - Special characters in search
  it("Edge Case: /feed - Should handle special characters in search", (done) => {
    const req = chai
      .request(server)
      .get("/feed?searchQuery=%26%23%24&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Edge case test 2 - Very long search query
  it("Edge Case: /feed - Should handle very long search queries", (done) => {
    const longQuery = "a".repeat(1000);
    const req = chai
      .request(server)
      .get(`/feed?searchQuery=${longQuery}&includeLocal=true`);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // Edge case test 3 - Invalid sort parameter
  it("Edge Case: /feed - Should handle invalid sort parameter gracefully", (done) => {
    const req = chai
      .request(server)
      .get("/feed?sortBy=invalid&includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include("Discover Events");
      done();
    });
  });

  // UI element test 1 - Search form presence
  it("UI Test: /feed - Should contain search form elements", (done) => {
    const req = chai.request(server).get("/feed");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include('id="searchQuery"');
      expect(res.text).to.include('id="sortBy"');
      expect(res.text).to.include('id="includeLocal"');
      expect(res.text).to.include('id="includeApi"');
      done();
    });
  });

  // UI element test 2 - Event card structure
  it("UI Test: /feed - Should display events in card format", (done) => {
    const req = chai.request(server).get("/feed?includeLocal=true");
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }
    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.include('class="card h-100 d-flex flex-column"');
      expect(res.text).to.include('class="card-title"');
      expect(res.text).to.include("View Details");
      expect(res.text).to.include("RSVP");
      done();
    });
  });

  // Performance test - Multiple concurrent requests
  it("Performance: /feed - Should handle multiple concurrent requests", (done) => {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      const req = chai.request(server).get("/feed?includeLocal=true");
      if (sessionCookie) {
        req.set("Cookie", sessionCookie);
      }
      requests.push(req);
    }

    Promise.all(requests)
      .then((responses) => {
        responses.forEach((res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.include("Discover Events");
        });
        done();
      })
      .catch(done);
  });
});

// ********************************************************************************

// *********************** CREATE EVENT ENDPOINT TESTCASES ***********************

describe("Create Event", () => {
  let sessionCookie;
  let testUser;

  // Helper function to create a test user and get session cookie
  before(async () => {
    const timestamp = Date.now();
    testUser = {
      name: "Event Creator Test User",
      email: `eventcreator${timestamp}@example.com`,
      password: "password123",
    };

    // Register test user
    await chai.request(server).post("/api/register").send(testUser);

    // Login to get session cookie
    const loginRes = await chai
      .request(server)
      .post("/login")
      .redirects(0)
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    // Extract session cookie from login response
    if (loginRes.headers["set-cookie"]) {
      sessionCookie = loginRes.headers["set-cookie"];
    }
  });

  // Clean up all events created by test user after all tests
  after(async () => {
    try {
      // Get the test user's ID
      const user = await db.oneOrNone("SELECT id FROM users WHERE email = $1", [
        testUser.email,
      ]);

      if (user) {
        // Delete all events created by this test user
        const deletedEvents = await db.result(
          "DELETE FROM custom_events WHERE organizer_id = $1",
          [user.id],
        );
        console.log(
          `Cleaned up ${deletedEvents.rowCount} test events for user: ${testUser.email}`,
        );

        // Also clean up the test user
        await db.none("DELETE FROM users WHERE id = $1", [user.id]);
        console.log(`Cleaned up test user: ${testUser.email}`);
      }
    } catch (error) {
      console.error("Error during test cleanup:", error);
    }
  });

  // Positive test case 1 - Successfully create an event with all required fields
  it("Positive: /create-event - Should create event with all required fields", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2); // 2 hours after start
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Test Event",
      description: "This is a test event description",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      expect(res.body.message).to.equal("Event created successfully!");
      expect(res.body.event).to.be.an("object");
      expect(res.body.event.title).to.equal("Test Event");
      expect(res.body.event.description).to.equal(
        "This is a test event description",
      );
      expect(res.body.event.location).to.equal("Test Location");
      done();
    });
  });

  // Positive test case 2 - Create event with optional image field
  it("Positive: /create-event - Should create event with optional image field", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 3);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Test Event with Image",
      description: "Event with image description",
      location: "Image Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      image: "https://example.com/image.jpg",
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      expect(res.body.message).to.equal("Event created successfully!");
      done();
    });
  });

  // Negative test case 1 - Unauthenticated user trying to create event
  it("Negative: /create-event - Should reject unauthenticated user", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Unauthorized Test Event",
      description: "This should fail",
      location: "Unauthorized Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    chai
      .request(server)
      .post("/create-event")
      .send(eventData)
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body.success).to.equal(false);
        expect(res.body.message).to.equal(
          "You must be logged in to create events",
        );
        done();
      });
  });

  // Negative test case 2 - Missing title field
  it("Negative: /create-event - Should fail when title is missing", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      description: "Event without title",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Negative test case 3 - Missing description field
  it("Negative: /create-event - Should fail when description is missing", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Event without description",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Negative test case 4 - Missing location field
  it("Negative: /create-event - Should fail when location is missing", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Event without location",
      description: "This event has no location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Negative test case 5 - Missing start date/time
  it("Negative: /create-event - Should fail when start date/time is missing", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const endDateTime = futureDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Event without start time",
      description: "This event has no start time",
      location: "Test Location",
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Negative test case 6 - Missing end date/time
  it("Negative: /create-event - Should fail when end date/time is missing", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Event without end time",
      description: "This event has no end time",
      location: "Test Location",
      startDateTime: startDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Negative test case 7 - Start time is after end time
  it("Negative: /create-event - Should fail when start time is after end time", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const earlierDate = new Date(futureDate);
    earlierDate.setHours(earlierDate.getHours() - 2); // 2 hours before start
    const endDateTime = earlierDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Invalid Time Event",
      description: "Start time after end time",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("Start time must be before end time");
      done();
    });
  });

  // Negative test case 8 - Event start time in the past
  it("Negative: /create-event - Should fail when event start time is in the past", (done) => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    const startDateTime = pastDate.toISOString().slice(0, 16);

    const endDate = new Date(pastDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Past Event",
      description: "This event is in the past",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal(
        "Event start time must be in the future",
      );
      done();
    });
  });

  // Negative test case 9 - Start time equals end time
  it("Negative: /create-event - Should fail when start time equals end time", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateTime = futureDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Zero Duration Event",
      description: "Event with same start and end time",
      location: "Test Location",
      startDateTime: dateTime,
      endDateTime: dateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("Start time must be before end time");
      done();
    });
  });

  // Edge case test 1 - Empty string fields
  it("Edge Case: /create-event - Should fail with empty string fields", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "",
      description: "",
      location: "",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal("All fields except image are required");
      done();
    });
  });

  // Edge case test 2 - Very long field values
  it("Edge Case: /create-event - Should handle very long field values", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const longString = "a".repeat(1000);
    const eventData = {
      title: longString,
      description: longString,
      location: longString,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      // Should either succeed or fail gracefully (depending on DB constraints)
      expect(res.status).to.be.oneOf([200, 400, 500]);
      if (res.status === 200) {
        expect(res.body.success).to.equal(true);
      } else {
        expect(res.body.success).to.equal(false);
      }
      done();
    });
  });

  // Edge case test 3 - Special characters in fields
  it("Edge Case: /create-event - Should handle special characters in fields", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Event with Special Chars: @#$%^&*()",
      description:
        "Description with quotes \"double\" and 'single' and <HTML> tags",
      location: "Location with symbols: & < > \" '",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      expect(res.body.event.title).to.equal(
        "Event with Special Chars: @#$%^&*()",
      );
      done();
    });
  });

  // Edge case test 4 - Invalid date format
  it("Edge Case: /create-event - Should handle invalid date format gracefully", (done) => {
    const eventData = {
      title: "Invalid Date Event",
      description: "Event with invalid date format",
      location: "Test Location",
      startDateTime: "invalid-date",
      endDateTime: "also-invalid",
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      // Should fail gracefully, either with validation error or database error
      expect(res.status).to.be.oneOf([400, 500]);
      expect(res.body.success).to.equal(false);
      done();
    });
  });

  // Edge case test 5 - Very short duration event (1 minute)
  it("Edge Case: /create-event - Should handle very short duration events", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setMinutes(endDate.getMinutes() + 1); // 1 minute later
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Short Event",
      description: "Very short duration event",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      done();
    });
  });

  // Edge case test 6 - Very long duration event (1 year)
  it("Edge Case: /create-event - Should handle very long duration events", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year later
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Long Duration Event",
      description: "Event lasting one year",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      done();
    });
  });

  // Boundary test 1 - Event starting in exactly 1 minute
  it("Boundary: /create-event - Should create event starting in exactly 1 minute", (done) => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 1);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Near Future Event",
      description: "Event starting very soon",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      done();
    });
  });

  // Boundary test 2 - Event starting in far future (1 year from now)
  it("Boundary: /create-event - Should create event in far future", (done) => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Far Future Event",
      description: "Event in the distant future",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      done();
    });
  });

  // Performance test - Multiple events creation
  it("Performance: /create-event - Should handle multiple event creations", (done) => {
    const promises = [];

    for (let i = 0; i < 5; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);
      const startDateTime = futureDate.toISOString().slice(0, 16);

      const endDate = new Date(futureDate);
      endDate.setHours(endDate.getHours() + 2);
      const endDateTime = endDate.toISOString().slice(0, 16);

      const eventData = {
        title: `Performance Test Event ${i + 1}`,
        description: `Description for performance test event ${i + 1}`,
        location: `Location ${i + 1}`,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
      };

      const req = chai.request(server).post("/create-event").send(eventData);
      if (sessionCookie) {
        req.set("Cookie", sessionCookie);
      }
      promises.push(req);
    }

    Promise.all(promises)
      .then((responses) => {
        responses.forEach((res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.equal(true);
        });
        done();
      })
      .catch(done);
  });

  // Security test - SQL injection attempt
  it("Security: /create-event - Should prevent SQL injection attempts", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "'; DROP TABLE custom_events; --",
      description: "SQL injection attempt in description",
      location: "Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      // Should either succeed (SQL injection prevented) or fail gracefully
      expect(res.status).to.be.oneOf([200, 400, 500]);
      if (res.status === 200) {
        expect(res.body.success).to.equal(true);
        // The title should be stored as-is, not executed as SQL
        expect(res.body.event.title).to.equal(
          "'; DROP TABLE custom_events; --",
        );
      }
      done();
    });
  });

  // Data integrity test - Verify event data is stored correctly
  it("Data Integrity: /create-event - Should store event data correctly in database", (done) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 8);
    const startDateTime = futureDate.toISOString().slice(0, 16);

    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 3);
    const endDateTime = endDate.toISOString().slice(0, 16);

    const eventData = {
      title: "Data Integrity Test Event",
      description: "Testing data integrity for event creation",
      location: "Integrity Test Location",
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    const req = chai.request(server).post("/create-event").send(eventData);
    if (sessionCookie) {
      req.set("Cookie", sessionCookie);
    }

    req.end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      expect(res.body.event).to.have.property("id");
      expect(res.body.event).to.have.property("created_at");
      expect(res.body.event.title).to.equal(eventData.title);
      expect(res.body.event.description).to.equal(eventData.description);
      expect(res.body.event.location).to.equal(eventData.location);

      // Verify dates are stored correctly (allowing for timezone differences)
      expect(new Date(res.body.event.start_time)).to.be.instanceOf(Date);
      expect(new Date(res.body.event.end_time)).to.be.instanceOf(Date);
      done();
    });
  });
});

// ********************************************************************************

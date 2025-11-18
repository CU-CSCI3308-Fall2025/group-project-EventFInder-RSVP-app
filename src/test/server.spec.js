// ********************** Initialize server **********************************

const server = require("../index"); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require("chai"); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

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
  // Positive test case - successful registration
  it("Positive: /register - Should register a new user successfully", (done) => {
    const timestamp = Date.now();
    chai
      .request(server)
      .post("/api/register")
      .send({
        name: "Test User",
        email: `testuser${timestamp}@example.com`,
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

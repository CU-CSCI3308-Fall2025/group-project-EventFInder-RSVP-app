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

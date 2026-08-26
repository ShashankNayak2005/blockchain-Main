const request = require("supertest");
const app = require("../src/app");
const { prisma, connectDB, disconnectDB } = require("../src/config/database");

describe("Authentication & JWT Security Integration Test Suite", () => {
  const testUser = {
    name: "Dr. Clara Oswald",
    email: `clara_${Date.now()}@university.edu`,
    password: "SecureAuthPassword123!"
  };

  let authToken = "";
  let userId = "";

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup test user from database
    if (userId) {
      await prisma.user.deleteMany({
        where: { email: testUser.email }
      });
    }
    await disconnectDB();
  });

  it("1. Should successfully register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.name).toBe(testUser.name);
    expect(res.body.data.user.role).toBe("USER");
    expect(res.body.data.user.passwordHash).toBeUndefined(); // NEVER EXPOSE PASSWORD HASH
    expect(res.body.data.token).toBeDefined();

    userId = res.body.data.user.id;
  });

  it("2. Should reject duplicate registration with 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.statusCode).toEqual(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("3. Should reject weak or invalid password registration with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Weak Password User",
        email: `weak_${Date.now()}@university.edu`,
        password: "123" // Too short (< 8 chars)
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("4. Should successfully authenticate user and return JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    authToken = res.body.data.token;
  });

  it("5. Should reject login with wrong password with 401 Unauthorized", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword999!"
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("6. Should reject protected route when Authorization token is missing", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("7. Should reject protected route when token is invalid or malformed", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid_gibberish_token_string");

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("8. Should allow access to protected profile route with valid JWT token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(userId);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

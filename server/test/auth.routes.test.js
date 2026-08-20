const request = require('supertest');
const app = require('../src/app');

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('ada@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('normalizes email to lowercase', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ADA@EXAMPLE.COM',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ada@example.com');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'dup@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Someone Else',
      email: 'dup@example.com',
      password: 'password456',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'short@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a missing required field', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const credentials = { name: 'Grace Hopper', email: 'grace@example.com', password: 'password123' };

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(credentials);

    const res = await request(app).post('/api/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects an incorrect password', async () => {
    await request(app).post('/api/auth/register').send(credentials);

    const res = await request(app).post('/api/auth/login').send({
      email: credentials.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('rejects a non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user profile for a valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Margaret Hamilton',
      email: 'margaret@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('margaret@example.com');
  });
});

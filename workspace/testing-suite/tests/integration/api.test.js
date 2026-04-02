const request = require('supertest');
const app = require('../../src/index');

describe('API Integration Tests', () => {
  describe('GET /', () => {
    test('should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({
        message: 'API de Testing funcionando correctamente'
      });
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /users', () => {
    test('should return list of users', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('email');
    });
  });

  describe('POST /users', () => {
    test('should create a new user', async () => {
      const newUser = {
        name: 'Carlos López',
        email: 'carlos@example.com'
      };

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
    });

    test('should return 400 if name is missing', async () => {
      const invalidUser = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name and email are required');
    });

    test('should return 400 if email is missing', async () => {
      const invalidUser = {
        name: 'Test User'
      };

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name and email are required');
    });
  });
});
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');

describe('Authentication & Authorization Integration Tests', () => {
    it('POST /api/auth/token - should return JWT token for valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/token')
            .send({
                username: 'admin.national',
                password: 'Admin@123'
            });

        assert.equal(res.status, 200);
        assert.ok(res.body.token, 'Token should be returned');
        assert.equal(res.body.role, 'analyst');
        assert.equal(res.body.scope_type, 'national');
    });

    it('POST /api/auth/token - should return 401 for invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/token')
            .send({
                username: 'admin.national',
                password: 'WrongPassword'
            });

        assert.equal(res.status, 401);
        assert.ok(res.body.error);
    });

    it('POST /api/auth/token - should return 400 when credentials are missing', async () => {
        const res = await request(app)
            .post('/api/auth/token')
            .send({
                username: 'admin.national'
            });

        assert.equal(res.status, 400);
        assert.ok(res.body.error);
    });

    it('GET /api/provinces - should return 401 when Authorization header is missing', async () => {
        const res = await request(app).get('/api/provinces');
        assert.equal(res.status, 401);
    });

    it('GET /api/provinces - should return 401 when token is malformed', async () => {
        const res = await request(app)
            .get('/api/provinces')
            .set('Authorization', 'Bearer invalid-token-sample');
        assert.equal(res.status, 401);
    });
});

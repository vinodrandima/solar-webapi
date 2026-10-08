const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const { getTestTokens } = require('../helpers');

describe('Jurisdiction & Scope Filtering Integration Tests', () => {
    const tokens = getTestTokens();

    it('GET /api/provinces - national analyst should receive all 9 provinces', async () => {
        const res = await request(app)
            .get('/api/provinces')
            .set('Authorization', `Bearer ${tokens.nationalAnalyst}`);

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.equal(res.body.length, 9);
    });

    it('GET /api/provinces - province analyst should only see their assigned province', async () => {
        const res = await request(app)
            .get('/api/provinces')
            .set('Authorization', `Bearer ${tokens.provinceAnalyst}`);

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].id, 1);
        assert.equal(res.body[0].name, 'Western');
    });

    it('GET /api/provinces/2 - province analyst 1 should get 404 when querying province 2', async () => {
        const res = await request(app)
            .get('/api/provinces/2')
            .set('Authorization', `Bearer ${tokens.provinceAnalyst}`);

        assert.equal(res.status, 404);
        assert.ok(res.body.error);
    });

    it('GET /api/provinces - device user should receive 403 Forbidden', async () => {
        const res = await request(app)
            .get('/api/provinces')
            .set('Authorization', `Bearer ${tokens.deviceUser}`);

        assert.equal(res.status, 403);
    });

    it('GET /api/provinces/1/districts - province analyst 1 gets districts of province 1', async () => {
        const res = await request(app)
            .get('/api/provinces/1/districts')
            .set('Authorization', `Bearer ${tokens.provinceAnalyst}`);

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(res.body.length > 0);
        // All districts should belong to province 1
        res.body.forEach(d => assert.equal(d.province_id, 1));
    });
});

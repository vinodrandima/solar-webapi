const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const { getTestTokens } = require('../helpers');

describe('Telemetry Ingestion & Device Scope Integration Tests', () => {
    const tokens = getTestTokens();

    it('POST /api/installations/1/readings - device 1 successfully writes reading to installation 1', async () => {
        const uniqueTime = new Date(Date.now() + 1000000).toISOString();
        const res = await request(app)
            .post('/api/installations/1/readings')
            .set('Authorization', `Bearer ${tokens.deviceUser}`)
            .send({
                recorded_at: uniqueTime,
                power_kw: 4.85,
                energy_kwh: 520.12,
                voltage: 232.4
            });

        assert.equal(res.status, 201);
        assert.ok(res.headers.location);
        assert.equal(res.body.installation_id, 1);
        assert.equal(res.body.power_kw, 4.85);
    });

    it('POST /api/installations/2/readings - device 1 is blocked from writing to installation 2 (403)', async () => {
        const res = await request(app)
            .post('/api/installations/2/readings')
            .set('Authorization', `Bearer ${tokens.deviceUser}`)
            .send({
                recorded_at: new Date().toISOString(),
                power_kw: 3.5,
                energy_kwh: 100.0,
                voltage: 230.0
            });

        assert.equal(res.status, 403);
        assert.ok(res.body.error);
    });

    it('POST /api/installations/1/readings - analyst role is blocked from writing readings (403)', async () => {
        const res = await request(app)
            .post('/api/installations/1/readings')
            .set('Authorization', `Bearer ${tokens.nationalAnalyst}`)
            .send({
                recorded_at: new Date().toISOString(),
                power_kw: 3.5,
                energy_kwh: 100.0,
                voltage: 230.0
            });

        assert.equal(res.status, 403);
    });

    it('POST /api/installations/1/readings - should reject invalid payload with 400', async () => {
        const res = await request(app)
            .post('/api/installations/1/readings')
            .set('Authorization', `Bearer ${tokens.deviceUser}`)
            .send({
                recorded_at: 'not-a-valid-date',
                power_kw: -10, // negative power
                energy_kwh: 100,
                voltage: 230
            });

        assert.equal(res.status, 400);
        assert.ok(res.body.error);
    });

    it('GET /api/installations/1/last-reading - should retrieve latest reading for national analyst', async () => {
        const res = await request(app)
            .get('/api/installations/1/last-reading')
            .set('Authorization', `Bearer ${tokens.nationalAnalyst}`);

        assert.equal(res.status, 200);
        assert.ok(res.body.power_kw !== undefined);
        assert.ok(res.body.recorded_at !== undefined);
    });
});

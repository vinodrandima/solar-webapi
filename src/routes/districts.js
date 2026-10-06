const express = require('express');
const db = require('../db');
const { authenticate, requireRole, enforceJurisdiction } = require('../auth');
const { handleConditionalGet } = require('../util/conditional');
const { NotFoundError } = require('../errors');

const router = express.Router();

router.use(authenticate, requireRole(['admin', 'analyst']));

router.get('/:id', enforceJurisdiction, (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    const stmt = db.prepare('SELECT * FROM districts WHERE id = ?');
    const district = stmt.get(id);

    if (!district) return next(new NotFoundError('District not found'));

    if (req.user.scope_type === 'district' && req.user.scope_id !== id) {
        return next(new NotFoundError('District not found'));
    }
    if (req.user.scope_type === 'province') {
        if (district.province_id !== req.user.scope_id) {
            return next(new NotFoundError('District not found'));
        }
    }

    handleConditionalGet(req, res, district);
});

router.get('/:id/substations', enforceJurisdiction, (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    const stmt = db.prepare('SELECT * FROM grid_substations WHERE district_id = ?');
    const substations = stmt.all(id);

    res.json(substations);
});

router.get('/:id/generation-summary', enforceJurisdiction, (req, res, next) => {
    const id = parseInt(req.params.id, 10);

    const distCheck = db.prepare('SELECT province_id FROM districts WHERE id = ?').get(id);
    if (!distCheck) return next(new NotFoundError('District not found'));
    if (req.user.scope_type === 'district' && req.user.scope_id !== id) return next(new NotFoundError('District not found'));
    if (req.user.scope_type === 'province' && req.user.scope_id !== distCheck.province_id) return next(new NotFoundError('District not found'));

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayISO = today.toISOString();

    const summaryQuery = `
        SELECT 
            COUNT(DISTINCT i.id) as installation_count,
            SUM(i.capacity_kw) as total_capacity_kw
        FROM installations i
        JOIN grid_substations gs ON i.grid_substation_id = gs.id
        WHERE gs.district_id = ?
    `;
    
    const readingsQuery = `
        SELECT r.installation_id, r.power_kw, r.energy_kwh, r.recorded_at
        FROM generation_readings r
        JOIN installations i ON r.installation_id = i.id
        JOIN grid_substations gs ON i.grid_substation_id = gs.id
        WHERE gs.district_id = ?
          AND r.recorded_at >= ?
          AND r.id IN (
              SELECT MAX(id) FROM generation_readings GROUP BY installation_id
          )
    `;

    const summary = db.prepare(summaryQuery).get(id);
    const latestReadings = db.prepare(readingsQuery).all(id, todayISO);

    const current_power_kw = latestReadings.reduce((sum, r) => sum + r.power_kw, 0);
    const today_energy_kwh = latestReadings.reduce((sum, r) => sum + r.energy_kwh, 0); 

    res.json({
        district_id: id,
        installation_count: summary.installation_count,
        total_capacity_kw: summary.total_capacity_kw,
        current_power_kw: Math.round(current_power_kw * 100) / 100,
        today_energy_kwh: Math.round(today_energy_kwh * 100) / 100,
        latest_readings_count: latestReadings.length
    });
});

module.exports = router;

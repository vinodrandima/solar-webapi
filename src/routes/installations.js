const express = require('express');
const db = require('../db');
const { authenticate, requireRole, enforceJurisdiction, requireWriteScope } = require('../auth');
const { handleConditionalGet } = require('../util/conditional');
const { NotFoundError, ValidationError, ConflictError } = require('../errors');
const { getPaginationOptions, buildPaginationLinks } = require('../util/pagination');

const router = express.Router();

router.use(authenticate, enforceJurisdiction);

const checkInstallationJurisdiction = (req, res, next) => {
    if (req.user.role === 'device') {
        if (req.user.installation_id !== parseInt(req.params.id, 10)) {
            return next(new NotFoundError('Installation not found'));
        }
        return next();
    }

    const id = parseInt(req.params.id, 10);
    const query = `SELECT id FROM installations installations WHERE id = ? AND ${req.jurisdictionFilter('installations')}`;
    const check = db.prepare(query).get(id);
    
    if (!check) {
        return next(new NotFoundError('Installation not found'));
    }
    next();
};

router.get('/:id', checkInstallationJurisdiction, (req, res, next) => {
    const stmt = db.prepare('SELECT * FROM installations WHERE id = ?');
    const installation = stmt.get(req.params.id);
    handleConditionalGet(req, res, installation);
});

router.get('/:id/details', checkInstallationJurisdiction, (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    const query = `
        SELECT 
            i.id, i.meter_id, i.owner_name, i.address, i.capacity_kw, i.created_at,
            gs.id as gs_id, gs.name as gs_name,
            d.id as d_id, d.name as d_name,
            p.id as p_id, p.name as p_name
        FROM installations i
        JOIN grid_substations gs ON i.grid_substation_id = gs.id
        JOIN districts d ON gs.district_id = d.id
        JOIN provinces p ON d.province_id = p.id
        WHERE i.id = ?
    `;
    const inst = db.prepare(query).get(id);

    const latestReading = db.prepare(`
        SELECT * FROM generation_readings 
        WHERE installation_id = ? 
        ORDER BY recorded_at DESC LIMIT 1
    `).get(id);

    res.json({
        installation: {
            id: inst.id,
            meter_id: inst.meter_id,
            owner_name: inst.owner_name,
            address: inst.address,
            capacity_kw: inst.capacity_kw,
            created_at: inst.created_at
        },
        hierarchy: {
            grid_substation: { id: inst.gs_id, name: inst.gs_name },
            district: { id: inst.d_id, name: inst.d_name },
            province: { id: inst.p_id, name: inst.p_name }
        },
        latest_reading: latestReading || null
    });
});

router.get('/:id/last-reading', checkInstallationJurisdiction, (req, res, next) => {
    const stmt = db.prepare('SELECT * FROM generation_readings WHERE installation_id = ? ORDER BY recorded_at DESC LIMIT 1');
    const reading = stmt.get(req.params.id);

    if (!reading) return next(new NotFoundError('No readings found for this installation'));

    handleConditionalGet(req, res, reading);
});

router.get('/:id/readings', checkInstallationJurisdiction, (req, res, next) => {
    const instId = parseInt(req.params.id, 10);
    const { from, to, sort = 'desc' } = req.query;
    const { page, page_size, offset } = getPaginationOptions(req);

    if (sort !== 'asc' && sort !== 'desc') {
        return next(new ValidationError('Sort must be asc or desc'));
    }

    let whereClause = 'installation_id = ?';
    let params = [instId];

    if (from) {
        whereClause += ' AND recorded_at >= ?';
        params.push(from);
    }
    if (to) {
        whereClause += ' AND recorded_at <= ?';
        params.push(to);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM generation_readings WHERE ${whereClause}`);
    const total_count = countStmt.get(...params).count;

    const query = `
        SELECT * FROM generation_readings 
        WHERE ${whereClause} 
        ORDER BY recorded_at ${sort.toUpperCase()} 
        LIMIT ? OFFSET ?
    `;
    params.push(page_size, offset);
    
    const stmt = db.prepare(query);
    const readings = stmt.all(...params);

    res.json({
        data: readings,
        total_count,
        page,
        page_size,
        links: buildPaginationLinks(req, page, page_size, total_count)
    });
});

router.post('/:id/readings', requireWriteScope, (req, res, next) => {
    const instId = parseInt(req.params.id, 10);
    const { recorded_at, power_kw, energy_kwh, voltage } = req.body;

    if (!recorded_at || power_kw === undefined || energy_kwh === undefined || voltage === undefined) {
        return next(new ValidationError('Missing required fields (recorded_at, power_kw, energy_kwh, voltage)'));
    }

    try {
        const stmt = db.prepare('INSERT INTO generation_readings (installation_id, recorded_at, power_kw, energy_kwh, voltage) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(instId, recorded_at, power_kw, energy_kwh, voltage);

        const newId = result.lastInsertRowid;
        
        const locationUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/${instId}/last-reading`;
        
        res.status(201).location(locationUrl).json({
            id: newId,
            installation_id: instId,
            recorded_at,
            power_kw,
            energy_kwh,
            voltage
        });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return next(new ConflictError(`Reading already exists for time ${recorded_at}`));
        }
        next(err);
    }
});

// CRUDS
router.put('/:id', requireRole(['admin']), (req, res, next) => {
    const { meter_id, owner_name, address, capacity_kw, grid_substation_id } = req.body;
    if (!meter_id || !owner_name || !address || !capacity_kw || !grid_substation_id) {
        return next(new ValidationError('Missing required fields for PUT'));
    }
    
    const stmt = db.prepare('UPDATE installations SET meter_id = ?, owner_name = ?, address = ?, capacity_kw = ?, grid_substation_id = ? WHERE id = ?');
    const result = stmt.run(meter_id, owner_name, address, capacity_kw, grid_substation_id, req.params.id);
    
    if (result.changes === 0) return next(new NotFoundError('Installation not found'));
    res.json({ message: 'Installation replaced successfully' });
});

router.patch('/:id', requireRole(['admin']), (req, res, next) => {
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(req.body)) {
        if (['meter_id', 'owner_name', 'address', 'capacity_kw', 'grid_substation_id'].includes(key)) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
    }
    
    if (updates.length === 0) return next(new ValidationError('No valid fields to update'));
    
    params.push(req.params.id);
    const stmt = db.prepare(`UPDATE installations SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    
    if (result.changes === 0) return next(new NotFoundError('Installation not found'));
    res.json({ message: 'Installation updated successfully' });
});

router.delete('/:id', requireRole(['admin']), (req, res, next) => {
    const stmt = db.prepare('DELETE FROM installations WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) return next(new NotFoundError('Installation not found'));
    res.status(204).send();
});

module.exports = router;

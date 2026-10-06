const express = require('express');
const db = require('../db');
const { authenticate, requireRole, enforceJurisdiction } = require('../auth');
const { handleConditionalGet } = require('../util/conditional');
const { NotFoundError } = require('../errors');

const router = express.Router();

// All province endpoints require analyst role
router.use(authenticate, requireRole(['admin', 'analyst']));

router.get('/', enforceJurisdiction, (req, res) => {
    let query = 'SELECT * FROM provinces';
    if (req.user.scope_type === 'province') {
        query += ` WHERE id = ${req.user.scope_id}`;
    } else if (req.user.scope_type === 'district') {
        query += ` WHERE id = (SELECT province_id FROM districts WHERE id = ${req.user.scope_id})`;
    }
    
    const stmt = db.prepare(query);
    const provinces = stmt.all();
    res.json(provinces);
});

router.get('/:id', enforceJurisdiction, (req, res, next) => {
    const stmt = db.prepare('SELECT * FROM provinces WHERE id = ?');
    const province = stmt.get(req.params.id);

    if (!province) {
        return next(new NotFoundError('Province not found'));
    }

    if (req.user.scope_type === 'province' && req.user.scope_id !== province.id) {
        return next(new NotFoundError('Province not found'));
    }

    handleConditionalGet(req, res, province);
});

router.get('/:id/districts', enforceJurisdiction, (req, res, next) => {
    const pId = parseInt(req.params.id, 10);

    if (req.user.scope_type === 'province' && req.user.scope_id !== pId) {
        return next(new NotFoundError('Province not found'));
    }

    let query = 'SELECT * FROM districts WHERE province_id = ?';
    if (req.user.scope_type === 'district') {
        query += ` AND id = ${req.user.scope_id}`;
    }
    
    const stmt = db.prepare(query);
    const districts = stmt.all(pId);
    res.json(districts);
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { authenticate, requireRole, enforceJurisdiction } = require('../auth');
const { handleConditionalGet } = require('../util/conditional');
const { NotFoundError } = require('../errors');

const router = express.Router();

router.use(authenticate, requireRole(['admin', 'analyst']));

router.get('/:id', enforceJurisdiction, (req, res, next) => {
    const stmt = db.prepare('SELECT * FROM grid_substations WHERE id = ?');
    const substation = stmt.get(req.params.id);

    if (!substation) return next(new NotFoundError('Grid substation not found'));

    handleConditionalGet(req, res, substation);
});

router.get('/:id/installations', enforceJurisdiction, (req, res, next) => {
    const gsId = parseInt(req.params.id, 10);
    
    // Check jurisdiction using the helper filter
    const query = `
        SELECT * FROM installations installations
        WHERE grid_substation_id = ? AND ${req.jurisdictionFilter('installations')}
    `;
    const stmt = db.prepare(query);
    const installations = stmt.all(gsId);

    res.json(installations);
});

module.exports = router;

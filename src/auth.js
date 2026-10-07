const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');
const { UnauthorizedError, ForbiddenError } = require('./errors');
const db = require('./db');

const generateToken = (user) => {
    const payload = {
        sub: user.id,
        role: user.role,
        scope_type: user.scope_type,
        scope_id: user.scope_id,
        installation_id: user.installation_id
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Middleware to verify JWT and extract user
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Missing or invalid Bearer token'));
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return next(new UnauthorizedError('Invalid or expired token'));
    }
};

// Middleware to require specific role(s)
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`));
        }
        next();
    };
};

// Middleware to enforce jurisdiction for read clients (analysts)
// Note: We use scope-based access control here. The token contains the scope (e.g. province, district).
// This avoids database lookups for the user on every request.
const enforceJurisdiction = (req, res, next) => {
    const { role, scope_type, scope_id } = req.user;

    if (scope_type === 'national') {
        req.jurisdictionFilter = () => '1=1';
        return next();
    }

    req.jurisdictionFilter = (tableAlias = 'installations') => {
        if (scope_type === 'province') {
            return `${tableAlias}.grid_substation_id IN (
                SELECT gs.id FROM grid_substations gs 
                JOIN districts d ON gs.district_id = d.id 
                WHERE d.province_id = ${scope_id}
            )`;
        }
        if (scope_type === 'district') {
            return `${tableAlias}.grid_substation_id IN (
                SELECT id FROM grid_substations WHERE district_id = ${scope_id}
            )`;
        }
        return '1=0';
    };

    next();
};

// Middleware to verify write scope (device can only write to its own installation_id)
const requireWriteScope = (req, res, next) => {
    const { role, installation_id } = req.user;
    const requestedId = parseInt(req.params.id, 10);

    if (role !== 'device') {
        return next(new ForbiddenError('Only device clients can write readings'));
    }

    if (installation_id !== requestedId) {
        return next(new ForbiddenError('Device cannot write data for another installation'));
    }

    next();
};

module.exports = {
    generateToken,
    authenticate,
    requireRole,
    enforceJurisdiction,
    requireWriteScope
};

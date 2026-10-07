const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken } = require('../auth');
const { UnauthorizedError, ValidationError } = require('../errors');

const router = express.Router();

router.post('/token', (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return next(new ValidationError('Username and password are required'));
    }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user) {
        return next(new UnauthorizedError('Invalid credentials'));
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
        return next(new UnauthorizedError('Invalid credentials'));
    }

    const token = generateToken(user);
    res.json({ token, role: user.role, scope_type: user.scope_type, scope_id: user.scope_id });
});

module.exports = router;

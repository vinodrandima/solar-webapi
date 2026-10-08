const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
    let dbStatus = 'healthy';
    try {
        db.prepare('SELECT 1').get();
    } catch (err) {
        dbStatus = 'unhealthy';
    }

    const memory = process.memoryUsage();

    res.status(dbStatus === 'healthy' ? 200 : 503).json({
        status: dbStatus === 'healthy' ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        database: dbStatus,
        memory: {
            rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
        },
        version: '1.0.0'
    });
});

module.exports = router;

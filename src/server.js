const app = require('./app');
const { PORT } = require('./config');
const db = require('./db');

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down server gracefully...`);
    server.close(() => {
        try {
            if (db && typeof db.close === 'function') {
                db.close();
                console.log('Database connection closed.');
            }
        } catch (err) {
            console.error('Error closing database connection:', err);
        }
        console.log('Server closed successfully.');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Forcefully terminating process after shutdown timeout.');
        process.exit(1);
    }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

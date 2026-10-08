const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { errorHandler, notFoundHandler } = require('./errors');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const provinceRoutes = require('./routes/provinces');
const districtRoutes = require('./routes/districts');
const substationRoutes = require('./routes/substations');
const installationRoutes = require('./routes/installations');
const openApiSpec = require('./openapi');

const app = express();

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

app.use(helmet({
    contentSecurityPolicy: false // Allows Swagger UI assets while enforcing standard security headers
}));
app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// System health check endpoint
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Removed Content-Type middleware as res.json() handles it natively

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/provinces', provinceRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/substations', substationRoutes);
app.use('/api/installations', installationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

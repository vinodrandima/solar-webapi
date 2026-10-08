const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { errorHandler, notFoundHandler } = require('./errors');

const authRoutes = require('./routes/auth');
const provinceRoutes = require('./routes/provinces');
const districtRoutes = require('./routes/districts');
const substationRoutes = require('./routes/substations');
const installationRoutes = require('./routes/installations');
const openApiSpec = require('./openapi');

const app = express();

app.use(helmet({
    contentSecurityPolicy: false // Allows Swagger UI assets while enforcing standard security headers
}));
app.use(cors());
app.use(express.json());

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

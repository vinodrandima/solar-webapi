const spec = {
    openapi: '3.0.0',
    info: {
        title: 'SLSEA Real-Time Solar Generation Data API',
        version: '1.0.0',
        description: 'A national system to acquire and serve real-time and historical solar power-generation data from rooftop solar installations across Sri Lanka.'
    },
    servers: [
        { url: '/api', description: 'Base path for all endpoints' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        responses: {
            Unauthorized: { description: 'Unauthorized or missing JWT' },
            Forbidden: { description: 'Forbidden - insufficient permissions or jurisdiction' },
            NotFound: { description: 'Resource not found' },
            ValidationError: { description: 'Bad request - validation failed' }
        }
    },
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Provinces', description: 'Province jurisdiction' },
        { name: 'Districts', description: 'District jurisdiction' },
        { name: 'Substations', description: 'Grid substations' },
        { name: 'Installations', description: 'Solar installations and their readings' }
    ],
    paths: {
        '/auth/token': {
            post: {
                tags: ['Auth'],
                summary: 'Get JWT token',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'admin.national' },
                                    password: { type: 'string', example: 'Admin@123' }
                                }
                            }
                        }
                    }
                },
                responses: { '200': { description: 'Successful login' } }
            }
        },
        '/provinces': {
            get: {
                tags: ['Provinces'],
                summary: 'Get all provinces (scoped to user jurisdiction)',
                responses: {
                    '200': { description: 'List of provinces' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' }
                }
            }
        },
        '/provinces/{id}': {
            get: {
                tags: ['Provinces'],
                summary: 'Get a specific province by ID',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Province details' },
                    '304': { description: 'Not Modified (ETag)' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/provinces/{id}/districts': {
            get: {
                tags: ['Provinces'],
                summary: 'Get all districts within a specific province',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'List of districts' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/districts/{id}': {
            get: {
                tags: ['Districts'],
                summary: 'Get a specific district by ID',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'District details' },
                    '304': { description: 'Not Modified' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/districts/{id}/substations': {
            get: {
                tags: ['Districts'],
                summary: 'Get all grid substations within a specific district',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'List of substations' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/districts/{id}/generation-summary': {
            get: {
                tags: ['Districts'],
                summary: 'Get generation summary for a specific district',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Aggregated generation summary' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/substations/{id}': {
            get: {
                tags: ['Substations'],
                summary: 'Get a specific grid substation by ID',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Substation details' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/substations/{id}/installations': {
            get: {
                tags: ['Substations'],
                summary: 'Get all solar installations connected to a specific substation',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'List of installations' }
                }
            }
        },
        '/installations/{id}': {
            get: {
                tags: ['Installations'],
                summary: 'Get atomic installation resource',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Installation details' },
                    '304': { description: 'Not Modified' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            },
            put: {
                tags: ['Installations'],
                summary: 'Full replace of an installation (Admin only)',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    meter_id: { type: 'string' },
                                    owner_name: { type: 'string' },
                                    address: { type: 'string' },
                                    capacity_kw: { type: 'number' },
                                    grid_substation_id: { type: 'integer' }
                                }
                            }
                        }
                    }
                },
                responses: { '200': { description: 'Replaced successfully' } }
            },
            patch: {
                tags: ['Installations'],
                summary: 'Partial update of an installation (Admin only)',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    owner_name: { type: 'string' },
                                    capacity_kw: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: { '200': { description: 'Updated successfully' } }
            },
            delete: {
                tags: ['Installations'],
                summary: 'Delete an installation (Admin only)',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: { '204': { description: 'Deleted successfully' } }
            }
        },
        '/installations/{id}/details': {
            get: {
                tags: ['Installations'],
                summary: 'Get COMPOSITE details (installation + hierarchy + latest reading)',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Composite details' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/installations/{id}/last-reading': {
            get: {
                tags: ['Installations'],
                summary: 'Get DERIVED single most recent generation reading',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Latest reading data' },
                    '404': { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/installations/{id}/readings': {
            post: {
                tags: ['Installations'],
                summary: 'Ingest a new generation reading (Device only)',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    recorded_at: { type: 'string', format: 'date-time' },
                                    power_kw: { type: 'number' },
                                    energy_kwh: { type: 'number' },
                                    voltage: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Created' },
                    '403': { description: 'Forbidden (Not owner device)' },
                    '409': { description: 'Conflict (Duplicate reading)' },
                    '400': { $ref: '#/components/responses/ValidationError' }
                }
            },
            get: {
                tags: ['Installations'],
                summary: 'Get historical readings for an installation (with pagination and filters)',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
                    { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                    { in: 'query', name: 'page_size', schema: { type: 'integer', default: 50 } },
                    { in: 'query', name: 'from', schema: { type: 'string', format: 'date-time' } },
                    { in: 'query', name: 'to', schema: { type: 'string', format: 'date-time' } },
                    { in: 'query', name: 'sort', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
                ],
                responses: { '200': { description: 'Paginated list of readings' } }
            }
        }
    }
};

module.exports = spec;

const { generateToken } = require('../src/auth');

/**
 * Generates mock JWT tokens for test roles and scopes.
 */
function getTestTokens() {
    return {
        nationalAnalyst: generateToken({
            id: 1,
            role: 'analyst',
            scope_type: 'national',
            scope_id: null,
            installation_id: null
        }),
        provinceAnalyst: generateToken({
            id: 2,
            role: 'analyst',
            scope_type: 'province',
            scope_id: 1, // Western Province
            installation_id: null
        }),
        districtAnalyst: generateToken({
            id: 3,
            role: 'analyst',
            scope_type: 'district',
            scope_id: 1, // Colombo District
            installation_id: null
        }),
        deviceUser: generateToken({
            id: 4,
            role: 'device',
            scope_type: 'none',
            scope_id: null,
            installation_id: 1
        }),
        otherDeviceUser: generateToken({
            id: 5,
            role: 'device',
            scope_type: 'none',
            scope_id: null,
            installation_id: 2
        })
    };
}

module.exports = {
    getTestTokens
};

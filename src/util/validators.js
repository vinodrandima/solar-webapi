const { ValidationError } = require('../errors');

/**
 * Validates ISO 8601 date strings.
 */
function isValidIsoDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr.slice(0, 10));
}

/**
 * Validates telemetry reading payload.
 */
function validateReadingPayload(body) {
    const { recorded_at, power_kw, energy_kwh, voltage } = body;

    if (!recorded_at || power_kw === undefined || energy_kwh === undefined || voltage === undefined) {
        throw new ValidationError('Missing required fields (recorded_at, power_kw, energy_kwh, voltage)');
    }

    if (isNaN(new Date(recorded_at).getTime())) {
        throw new ValidationError('Field "recorded_at" must be a valid ISO 8601 date string');
    }

    if (typeof power_kw !== 'number' || power_kw < 0) {
        throw new ValidationError('Field "power_kw" must be a non-negative number');
    }

    if (typeof energy_kwh !== 'number' || energy_kwh < 0) {
        throw new ValidationError('Field "energy_kwh" must be a non-negative number');
    }

    if (typeof voltage !== 'number' || voltage <= 0) {
        throw new ValidationError('Field "voltage" must be a positive number');
    }
}

/**
 * Validates installation creation/update payload.
 */
function validateInstallationPayload(body) {
    const { meter_id, owner_name, address, capacity_kw, grid_substation_id } = body;

    if (!meter_id || !owner_name || !address || !capacity_kw || !grid_substation_id) {
        throw new ValidationError('Missing required fields for installation');
    }

    if (typeof capacity_kw !== 'number' || capacity_kw <= 0) {
        throw new ValidationError('Field "capacity_kw" must be greater than zero');
    }

    if (!Number.isInteger(grid_substation_id) || grid_substation_id <= 0) {
        throw new ValidationError('Field "grid_substation_id" must be a positive integer');
    }
}

module.exports = {
    isValidIsoDate,
    validateReadingPayload,
    validateInstallationPayload
};

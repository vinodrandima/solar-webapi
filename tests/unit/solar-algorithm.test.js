const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function calculateSolarPower(hour, capacityKw, noise = 1.0) {
    if (hour < 6 || hour >= 18) {
        return 0;
    }
    const peakRatio = Math.sin(((hour - 6) / 12) * Math.PI);
    let power = capacityKw * peakRatio * noise;
    if (power < 0) power = 0;
    if (power > capacityKw) power = capacityKw;
    return Math.round(power * 100) / 100;
}

function calculateEnergyAccumulation(previousEnergy, powerKw, intervalHours = 0.25) {
    return Math.round((previousEnergy + (powerKw * intervalHours)) * 100) / 100;
}

describe('Solar Generation Algorithm Unit Tests', () => {
    const capacityKw = 5.0;

    it('should generate 0 kW during night hours before 6:00', () => {
        assert.equal(calculateSolarPower(0, capacityKw), 0);
        assert.equal(calculateSolarPower(4, capacityKw), 0);
        assert.equal(calculateSolarPower(5.9, capacityKw), 0);
    });

    it('should generate 0 kW after sunset at or past 18:00', () => {
        assert.equal(calculateSolarPower(18, capacityKw), 0);
        assert.equal(calculateSolarPower(21, capacityKw), 0);
        assert.equal(calculateSolarPower(23.5, capacityKw), 0);
    });

    it('should achieve peak solar output at 12:00 midday', () => {
        const peakPower = calculateSolarPower(12, capacityKw, 1.0);
        assert.equal(peakPower, capacityKw);
    });

    it('should follow symmetric sine curve morning vs afternoon', () => {
        const morningPower = calculateSolarPower(9, capacityKw, 1.0); // 3 hours after 6
        const afternoonPower = calculateSolarPower(15, capacityKw, 1.0); // 3 hours before 18
        assert.equal(morningPower, afternoonPower);
    });

    it('should clamp power output so it never exceeds rated installation capacity', () => {
        const excessiveNoise = 1.8; // Simulating extreme sensor spike
        const power = calculateSolarPower(12, capacityKw, excessiveNoise);
        assert.equal(power, capacityKw);
    });

    it('should accurately accumulate energy for 15-minute intervals (0.25h)', () => {
        let energy = 100.0;
        const power = 4.0; // 4 kW for 15 minutes = 1 kWh
        energy = calculateEnergyAccumulation(energy, power, 0.25);
        assert.equal(energy, 101.0);
    });
});

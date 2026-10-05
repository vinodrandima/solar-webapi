const bcrypt = require('bcryptjs');
const db = require('./db');

// Seed script to generate idempotent database state.
// Runs inside a single transaction to ensure consistency and speed.

const provincesData = [
    { name: 'Western' }, { name: 'Central' }, { name: 'Southern' },
    { name: 'Uva' }, { name: 'Sabaragamuwa' }, { name: 'North Western' },
    { name: 'North Central' }, { name: 'Nothern' }, { name: 'Eastern' }
];

const districtsData = {
    'Western': ['Colombo', 'Gampaha', 'Kalutara'],
    'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
    'Southern': ['Galle', 'Matara', 'Hambantota'],
    'Uva': ['Badulla', 'Monaragala'],
    'Sabaragamuwa': ['Kegalle', 'Ratnapura'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    'Nothern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
    'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara']
};

const seed = () => {
    // 1. Wipe existing data cleanly (since foreign_keys=ON, deletion order matters, but dropping tables is easier)
    const tables = ['users', 'generation_readings', 'installations', 'grid_substations', 'districts', 'provinces'];
    for (const table of tables) {
        db.exec(`DELETE FROM ${table}`);
        // Reset sqlite_sequence to restart auto-increment IDs
        db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
    }

    // 2. Prepare statements
    const insertProvince = db.prepare('INSERT INTO provinces (name) VALUES (?)');
    const insertDistrict = db.prepare('INSERT INTO districts (province_id, name) VALUES (?, ?)');
    const insertSubstation = db.prepare('INSERT INTO grid_substations (district_id, name) VALUES (?, ?)');
    const insertInstallation = db.prepare('INSERT INTO installations (grid_substation_id, meter_id, owner_name, address, capacity_kw) VALUES (?, ?, ?, ?, ?)');
    const insertReading = db.prepare('INSERT INTO generation_readings (installation_id, recorded_at, power_kw, energy_kwh, voltage) VALUES (?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, scope_type, scope_id, installation_id) VALUES (?, ?, ?, ?, ?, ?)');

    // Common passwords
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const analystHash = bcrypt.hashSync('Analyst@123', 10);

    // 3. Insert hierarchical data
    let meterCounter = 100000;
    const installations = [];
    let provinceIdMap = {};
    let districtIdMap = {};

    for (const p of provincesData) {
        const resP = insertProvince.run(p.name);
        const pId = resP.lastInsertRowid;
        provinceIdMap[p.name.toLowerCase()] = pId;

        for (const dName of districtsData[p.name]) {
            const resD = insertDistrict.run(pId, dName);
            const dId = resD.lastInsertRowid;
            districtIdMap[dName.toLowerCase()] = dId;

            // 1 Grid Substation per district
            const resGS = insertSubstation.run(dId, `${dName} Main GS`);
            const gsId = resGS.lastInsertRowid;

            // Distribute 220 installations across 25 substations (approx 8-9 each)
            // Just distribute 8 for most, 10 for a few to reach 220
            const count = (dId <= 20) ? 9 : 8; // 20*9 + 5*8 = 180 + 40 = 220
            for (let i = 0; i < count; i++) {
                meterCounter++;
                const meter_id = `MTR-${meterCounter}`;
                const capacity = Math.round((2 + Math.random() * 8) * 10) / 10; // 2 to 10 kW

                const resInst = insertInstallation.run(
                    gsId,
                    meter_id,
                    `Owner ${meterCounter}`,
                    `Address ${i}, ${dName}`,
                    capacity
                );

                const instId = resInst.lastInsertRowid;
                installations.push({ id: instId, capacity, meter_id });

                // Create device user
                insertUser.run(
                    meter_id,
                    bcrypt.hashSync(`Solar@${instId}`, 10),
                    'device',
                    'none',
                    null,
                    instId
                );
            }
        }
    }

    // 4. Generate Readings (Last 7 days, 15 min intervals, realistic curve)
    console.log('Generating readings (this may take a few seconds)...');
    const now = new Date();
    // Normalize "now" to nearest 15 min to have clean intervals
    now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const intervalsCount = 7 * 24 * 4; // 672 per installation

    // Use manual batch insert (the whole seed is wrapped in a transaction)
    const insertManyReadings = (readings) => {
        for (const r of readings) {
            insertReading.run(r.inst_id, r.timestamp, r.power, r.energy, r.voltage);
        }
    };

    let allReadings = [];
    // We process installations in batches to avoid eating too much memory
    for (const inst of installations) {
        let currentEnergy = Math.random() * 1000; // start at some baseline

        for (let i = 0; i < intervalsCount; i++) {
            const time = new Date(sevenDaysAgo.getTime() + i * 15 * 60 * 1000);
            const hour = time.getHours();

            let power = 0;
            let voltage = 231 + (Math.random() - 0.5) * 2; // Idle voltage ~231

            // Generation between 6 AM and 6 PM
            if (hour >= 6 && hour < 18) {
                // simple sine curve for solar generation peak at 12
                const peakRatio = Math.sin(((hour - 6) / 12) * Math.PI);
                // add some random cloud noise
                const noise = 0.8 + (Math.random() * 0.4);
                power = inst.capacity * peakRatio * noise;
                if (power < 0) power = 0;
                if (power > inst.capacity) power = inst.capacity;

                // Generating voltage ~228-238V
                voltage = 233 + (Math.random() - 0.5) * 10;
            }

            // energy is cumulative
            currentEnergy += (power * 0.25);

            allReadings.push({
                inst_id: inst.id,
                timestamp: time.toISOString(),
                power: Math.round(power * 100) / 100,
                energy: Math.round(currentEnergy * 100) / 100,
                voltage: Math.round(voltage * 10) / 10
            });

            if (allReadings.length >= 10000) {
                insertManyReadings(allReadings);
                allReadings = [];
            }
        }
    }
    // Flush remaining
    if (allReadings.length > 0) {
        insertManyReadings(allReadings);
    }

    // 5. Insert Admin and Analyst Users
    // National Analyst
    insertUser.run('admin.national', adminHash, 'analyst', 'national', null, null);

    // Province Analysts
    const pWesternId = provinceIdMap['western'];
    const pCentralId = provinceIdMap['central'];
    const pSouthernId = provinceIdMap['southern'];
    if (pWesternId) insertUser.run('analyst.western', analystHash, 'analyst', 'province', pWesternId, null);
    if (pCentralId) insertUser.run('analyst.central', analystHash, 'analyst', 'province', pCentralId, null);
    if (pSouthernId) insertUser.run('analyst.southern', analystHash, 'analyst', 'province', pSouthernId, null);

    // District Analysts
    const dColomboId = districtIdMap['colombo'];
    const dKandyId = districtIdMap['kandy'];
    const dGalleId = districtIdMap['galle'];
    if (dColomboId) insertUser.run('analyst.colombo', analystHash, 'analyst', 'district', dColomboId, null);
    if (dKandyId) insertUser.run('analyst.kandy', analystHash, 'analyst', 'district', dKandyId, null);
    if (dGalleId) insertUser.run('analyst.galle', analystHash, 'analyst', 'district', dGalleId, null);

    console.log('Seed completed successfully!');
};

// Wrap the whole seed in a transaction so it either fully succeeds or fully fails
try {
    db.exec('BEGIN EXCLUSIVE TRANSACTION');
    seed();
    db.exec('COMMIT');
} catch (e) {
    db.exec('ROLLBACK');
    throw e;
}

module.exports = seed;

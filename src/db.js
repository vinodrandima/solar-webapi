const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const dbPath = process.env.DATABASE_URL || './solar.db';


// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Open database connection
const db = new DatabaseSync(dbPath);

// Enable WAL (Write-Ahead Logging) for better concurrency (readers do not block writers).
// This is critical for an API that expects frequent telemetry writes while analysts run reads.
db.exec('PRAGMA journal_mode = WAL;');

// Enforce foreign key constraints. SQLite disables this by default for backwards compatibility.
// Essential for ensuring readings belong to real installations, installations to real districts, etc.
db.exec('PRAGMA foreign_keys = ON;');

// Note on Data Model Decisions:
// 1. Meter/Inverter ID (meter_id) is an ATTRIBUTE of the SolarInstallation table.
//    Rationale: We assume a 1:1 hardware-to-site relationship for this MVP. Separating Device 
//    and Installation adds unnecessary join complexity when the core business unit is the Installation itself.
// 2. Readings as append-only time series (generation_readings).
//    Rationale: Storing real-time data as a time-series enables historical analysis, billing, and forecasting. 
//    Keeping it append-only avoids update contention. We can quickly get the latest status using ORDER BY recorded_at DESC LIMIT 1.

const initDb = () => {
    // We use integer primary keys and auto-increment for fast indexing.
    // 'recorded_at' is stored as a DATETIME string (ISO 8601) which SQLite can natively sort and filter.

    db.exec(`
        CREATE TABLE IF NOT EXISTS provinces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS districts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            province_id INTEGER NOT NULL,
            name TEXT NOT NULL UNIQUE,
            FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS grid_substations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            district_id INTEGER NOT NULL,
            name TEXT NOT NULL UNIQUE,
            FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS installations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grid_substation_id INTEGER NOT NULL,
            meter_id TEXT NOT NULL UNIQUE,
            owner_name TEXT NOT NULL,
            address TEXT NOT NULL,
            capacity_kw REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (grid_substation_id) REFERENCES grid_substations(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS generation_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            installation_id INTEGER NOT NULL,
            recorded_at DATETIME NOT NULL,
            power_kw REAL NOT NULL,
            energy_kwh REAL NOT NULL,
            voltage REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
            UNIQUE (installation_id, recorded_at) -- Prevent duplicate readings for the same time
        );

        -- Index to speed up time-window queries and retrieving the latest reading
        CREATE INDEX IF NOT EXISTS idx_readings_installation_time ON generation_readings (installation_id, recorded_at);

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'analyst', 'device')),
            scope_type TEXT CHECK(scope_type IN ('national', 'province', 'district', 'none')),
            scope_id INTEGER, -- Refers to province.id or district.id, based on scope_type
            installation_id INTEGER, -- Set ONLY if role = 'device'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE
        );
    `);
};

initDb();

module.exports = db;

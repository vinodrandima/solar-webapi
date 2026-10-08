# Real-Time Solar Generation Data API
> **Sri Lanka Sustainable Energy Authority (SLSEA)**  
> National system to acquire and serve real-time and historical solar power-generation data from rooftop solar installations across Sri Lanka.

[![Node.js CI](https://github.com/vinodrandima/solar-webapi/actions/workflows/test.yml/badge.svg)](https://github.com/vinodrandima/solar-webapi/actions)
![Node Version](https://img.shields.io/badge/Node.js-%3E%3D22.5.0-brightgreen)
![Database](https://img.shields.io/badge/SQLite-WAL%20Mode-blue)
![API Docs](https://img.shields.io/badge/OpenAPI-3.0%20Swagger-orange)
![Tests](https://img.shields.io/badge/Tests-21%20Passed-success)

---

## Architecture & Hierarchy

The system models Sri Lanka's power grid hierarchy and solar telemetry:

```text
Provinces (9)
   └── Districts (25)
         └── Grid Substations
               └── Installations (Rooftop Solar PVs)
                     ├── Generation Readings (15-min intervals: kW, kWh, V)
                     └── Inverter Device Account (Write-scoped)
```

### Security & Scope Matrix

| Role | Scope | Read Access | Write Access |
|---|---|---|---|
| **National Analyst** | `national` | All 9 provinces, 25 districts, all installations & readings | None |
| **Province Analyst** | `province` | Only installations & substations in assigned province | None |
| **District Analyst** | `district` | Only installations & substations in assigned district | None |
| **Device Client** | `none` | Own installation only | Own telemetry readings (`POST /api/installations/:id/readings`) |

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Database Seeding
Seeds hierarchical administrative divisions, 220 rooftop solar installations, authentication accounts, and **~147,000 realistic 15-minute generation readings** for the past 7 days using the Daily Solar Curve algorithm:
```bash
npm run seed
```

### 3. Running the Server
```bash
# Development mode (nodemon)
npm run dev

# Production mode
npm start
```

### 4. Interactive API Documentation
Open your browser to:
[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## Running Automated Tests

The test suite runs with Node.js built-in test runner (`node:test`) and Supertest:
```bash
npm test
```

### Test Coverage Breakdown:
- **Unit Tests:** Daily Solar generation curve, boundary conditions (night vs day), capacity clamps, and cumulative energy integration.
- **Authentication Integration:** Token issuance, password verification, missing credentials, invalid bearer tokens.
- **Jurisdiction & Scope:** National vs Province vs District analyst visibility, 403 Forbidden checks for unauthorized devices.
- **Telemetry Ingestion:** Device write-scope verification, payload validation, duplicate timestamp prevention (409 Conflict).

---

## System Health Check

Check application uptime, memory usage, and database connection status:
```http
GET /health
GET /api/health
```

Example response:
```json
{
  "status": "UP",
  "timestamp": "2026-10-27T18:07:12.516Z",
  "uptime": "42s",
  "database": "healthy",
  "memory": {
    "rss": "72MB",
    "heapUsed": "13MB"
  },
  "version": "1.0.0"
}
```

---

## Postman Collection

A complete, pre-configured collection is provided at:
[`docs/solar-api.postman_collection.json`](./docs/solar-api.postman_collection.json)

Import it into Postman to test authentication, geographic drill-downs, and telemetry write endpoints.

---

## Default Credentials

| Username | Password | Role / Scope |
|---|---|---|
| `admin.national` | `Admin@123` | National Analyst |
| `analyst.western` | `Analyst@123` | Western Province Analyst |
| `analyst.colombo` | `Analyst@123` | Colombo District Analyst |
| `MTR-100001` | `Solar@1` | Device User (Installation #1) |

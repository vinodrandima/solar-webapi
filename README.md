# Real-Time Solar Generation Data API
Sri Lanka Sustainable Energy Authority

## Overview
A national system to acquire and serve real-time and historical solar power-generation data from rooftop solar installations across Sri Lanka.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Seed the database (creates hierarchical data, installations, users, and ~147,000 realistic 15-min generation readings for the past 7 days):
   ```bash
   npm run seed
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

4. View API Documentation:
   Navigate to [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Credentials
- National Admin: `admin.national` / `Admin@123`
- Western Province Analyst: `analyst.western` / `Analyst@123`
- Colombo District Analyst: `analyst.colombo` / `Analyst@123`
- Device Users: username=`MTR-100001`, password=`Solar@<installation_id>`

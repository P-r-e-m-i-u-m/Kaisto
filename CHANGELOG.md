# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] - 2026-06-09

### Security
- `jsonwebtoken` 8.5.1 -> 9.0.0 — patches CVE-2022-23529 (critical)
- `express` 4.18.2 -> 4.19.2 — patches CVE-2024-29041 (moderate)
- `axios` 1.6.0 -> 1.7.2 — patches CVE-2024-39338 (moderate)
- `dotenv` 16.0.3 -> 16.4.5 — patches prototype pollution issue
- `redis` 4.6.7 -> 4.6.14 — stability fixes

### Changed
- Replaced deprecated `node-fetch` with native `fetch` API (Node 18+)
- Migrated from `moment.js` to `date-fns` (reduces bundle by ~67%)
- Updated `jest` 29.5.0 -> 29.7.0 for better async test support
- Updated `eslint` 8.x -> 9.x with new flat config format

### Removed
- Removed unused `lodash` dependency (native alternatives used)
- Removed `body-parser` (now bundled with express 4.x)

## [1.3.0] - 2026-03-20

### Added
- Sliding window rate limiter with Redis sorted sets
- Circuit breaker pattern for external API calls
- Cursor-based pagination replacing offset pagination
- Structured JSON logger with file and console transports

### Fixed
- Memory leak in WebSocket connection manager
- Race condition in async job queue processor
- CORS misconfiguration allowing all origins in production
- Missing composite indexes causing 800ms query times

## [1.2.0] - 2026-02-10

### Added
- Redis caching layer for authentication tokens
- Global error handler with AppError classification
- Health check endpoint with DB and cache monitoring

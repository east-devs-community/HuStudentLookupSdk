# HuStdLookupSdk

> High-performance in-memory lookup, search, and dormitory placement SDK for Haramaya University student records.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/types-included-blue.svg)]()

`HuStdLookupSdk` provides lightning-fast search and retrieval across 12,000+ Haramaya University student placement records. Built with custom inverted indexes, binary search prefix matching, and bitmap set operations, queries execute in sub-millisecond time with **zero external dependencies**.

---

## Features

- ⚡ **O(1) Instant Lookups**: Retrieve student details by ID in constant time. Automatically strips `UGPR` prefixes and normalizes whitespace and casing (e.g. `"UGPR1175/15"` $\rightarrow$ `"1175/15"`).
- 🔍 **Prefix & Multi-Word Name Search**: Fast tokenized name search using sorted token indexes and binary search. Every entered word matches the beginning of a name token (e.g. `"abd wash"` finds `"Abdukadir ... Wash..."`).
- 🎯 **Multi-Field Filtering**: Filter students by `sex`, `dept`, `campus`, `building`, `year`, and `dorm`.
- 🔀 **OR Query Support**: Supply an array of values to match any of them (e.g. `campus: ['Hit', 'Harar']`).
- 👥 **Roommate Resolution**: Instantly retrieve full student profiles for all roommates assigned to the same room.
- 📊 **Faceted Aggregations**: Extract distinct counts for any filter field to power UI dropdowns, filters, and analytics.
- 📄 **Pagination**: Built-in `limit` and `offset` support for infinite scroll or paginated interfaces.
- 📦 **Zero Dependencies & TypeScript Ready**: Uses native Node.js data structures (`Map`, `Uint8Array`) and ships with comprehensive TypeScript definitions (`src/index.d.ts`).
- 🔄 **Backwards Compatible**: Exports legacy `DormSDK` as an alias.

---

## Directory Structure

```text
.
├── package.json           # Package configuration & test scripts
├── readme.md              # Documentation
├── sdk.test.js            # Node test suite
└── src/
    ├── HuStdLookupSdk.js  # Core SDK implementation
    ├── data.json          # Predefined student placement dataset
    ├── index.d.ts         # TypeScript declaration file
    └── index.js           # Main package entry point
```

---

## Installation

```bash
npm install hu-std-lookup-sdk
```

---

## Quick Start

### 1. Import

```javascript
// CommonJS (both default and named imports work)
const HuStdLookupSdk = require('hu-std-lookup-sdk');
// or: const { HuStdLookupSdk } = require('hu-std-lookup-sdk');

// ES Modules / TypeScript
import HuStdLookupSdk, { StudentRecord } from 'hu-std-lookup-sdk';
```

### 2. Initialization

```javascript
// Load the SDK with the embedded dataset (takes no arguments)
const sdk = HuStdLookupSdk.load();
```

---

## Usage Examples

### 1. Lookup Student by ID

```javascript
const student = sdk.getById('1175/15');
console.log(student);
/*
{
  id: '1175/15',
  name: 'Adane Absaye Ayle',
  sex: 'M',
  dept: 'Mechanical Engineering',
  campus: 'Hit',
  building: 'B-12',
  dorm: '204',
  year: 'IV',
  dormmates: ['1180/15', '1182/15', '1190/15']
}
*/

// Case and spacing are normalized; 'UGPR' prefix is automatically handled:
sdk.getById(' 1175/15 ');
sdk.getById('UGPR1175/15');
```

### 2. Get Roommates (Dormmates)

```javascript
// Resolves student records for everyone sharing the same dorm room (excluding self)
const roommates = sdk.getDormmates('1175/15');
roommates.forEach((mate) => {
  console.log(`${mate.name} (${mate.dept})`);
});
```

### 3. Search by Name (Prefix Matching)

All words must match the start of any word in the student's name:

```javascript
const { total, results } = sdk.search({
  name: 'abdu wash'
});

console.log(`Found ${total} match(es):`);
results.forEach((s) => console.log(`- ${s.name} (${s.id})`));
```

### 4. Filter by Campus, Department, Sex, Year, or Building

```javascript
const femaleLawStudents = sdk.search({
  dept: 'law',
  campus: 'main',
  sex: 'F'
});

console.log(`Total female law students on Main campus: ${femaleLawStudents.total}`);
```

### 5. OR Queries (Multiple Values)

Pass an array to any filter field:

```javascript
const multiCampus = sdk.search({
  campus: ['Hit', 'Harar'],
  year: 'III',
  limit: 10,
  offset: 0
});

console.log(`Matched: ${multiCampus.total}`);
console.log(`Page results: ${multiCampus.results.length}`);
```

### 6. Aggregations / Facets for Dropdowns

Get value counts for any field to populate dropdown options:

```javascript
const campuses = sdk.facets('campus');
console.log(campuses);
// [
//   { value: 'Main', count: 6800 },
//   { value: 'Hit', count: 2650 },
//   { value: 'Harar', count: 2575 },
//   { value: 'VET', count: 186 }
// ]

const departments = sdk.facets('dept');
console.log(`Total departments: ${departments.length}`);
```

---

## API Reference

### `HuStdLookupSdk`

#### Static Methods

- `HuStdLookupSdk.load(): HuStdLookupSdk`
  Loads an SDK instance with the predefined dataset from `src/data.json` (takes no arguments).

#### Constructor

- `new HuStdLookupSdk(data?: object)`
  Initializes an SDK instance directly. Defaults to the predefined dataset if omitted.

#### Instance Properties

- `sdk.records: StudentRecord[]`: Array of all student records sorted A-Z by name.
- `sdk.size: number`: Total number of student records.
- `sdk.campuses: string[]`: List of available campuses.
- `sdk.departments: string[]`: List of available departments.

#### Instance Methods

- `sdk.getById(id: string): StudentRecord | null`
  O(1) lookup. Returns the student record or `null` if not found.
- `sdk.getDormmates(id: string): StudentRecord[]`
  Returns an array of resolved student records for roommates in the same room.
- `sdk.search(query?: SearchQuery): { total: number, results: StudentRecord[] }`
  Performs multi-criteria filtering and name prefix matching.
- `sdk.facets(field: string): Array<{ value: string, count: number }>`
  Returns distinct values and counts for the specified field (`'sex'`, `'dept'`, `'campus'`, `'building'`, `'year'`, `'dorm'`).

### Supported Filter Fields

```javascript
const { FILTER_FIELDS } = require('./src');
// ['sex', 'dept', 'campus', 'building', 'year', 'dorm']
```

---

## Student Record Schema

Each student record conforms to the following schema:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Student ID (e.g. `'1175/15'`, `'428316'`) |
| `name` | `string` | Full student name |
| `sex` | `string` | Gender (`'M'` or `'F'`) |
| `dept` | `string` | Academic department |
| `campus` | `string` | Campus name (`'Harar'`, `'Hit'`, `'Main'`, `'VET'`) |
| `building` | `string` | Dormitory block/building |
| `dorm` | `string` | Room number |
| `year` | `string` | Academic year (e.g. `'I'`, `'II'`, `'III'`, `'IV'`, `'V'`) |
| `dormmates` | `string[]` | Array of roommate student IDs sharing the same room |

---

## Running Tests

Run the native Node.js test suite:

```bash
npm test
# or directly:
node --test sdk.test.js
```

---

## License

MIT

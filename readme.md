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

#### Example A: Dagim Alemu (Software Engineering, Main Campus)
```javascript
const dagim = sdk.getById('0276/15');
console.log(dagim);
/*
{
  id: '0276/15',
  name: 'Dagim Alemu Alolo',
  sex: 'M',
  dept: 'SWE',
  campus: 'Main',
  building: 'SAT 4A',
  dorm: '120',
  year: '5th',
  dormmates: ['0272/15', '0297/15', '0301/15']
}
*/

// Case and spacing are normalized; 'UGPR' prefix is automatically handled:
sdk.getById(' 0276/15 ');
sdk.getById('UGPR0276/15');
```

#### Example B: Elbetel Taye (Mechanical Engineering, HiT Campus)
```javascript
const elbetel = sdk.getById('1228/18');
console.log(elbetel);
/*
{
  id: '1228/18',
  name: 'Elbetel Taye Ladankilet',
  sex: 'F',
  dept: 'Meng',
  campus: 'Hit',
  building: 'Block LA',
  dorm: '44',
  year: '2nd',
  dormmates: ['0844/18', '1315/18', '1788/18', '1836/18', '1979/18']
}
*/
```

---

### 2. Get Roommates (Dormmates)

Retrieve full student profiles for everyone sharing the same dorm room (excluding self):

```javascript
// Roommates of Dagim Alemu in SAT 4A, Dorm 120:
const dagimMates = sdk.getDormmates('0276/15');
dagimMates.forEach((mate) => {
  console.log(`${mate.name} - ${mate.dept} (Dorm ${mate.dorm})`);
});
// Output:
// Chuol Nyuon Dak - SWE (Dorm 120)
// Dawit Mengesha Beriso - SWE (Dorm 120)
// Debela Kebede Bekele - SWE (Dorm 120)

// Roommates of Elbetel Taye in Block LA, Dorm 44:
const elbetelMates = sdk.getDormmates('1228/18');
elbetelMates.forEach((mate) => {
  console.log(`${mate.name} - ${mate.dept} (Dorm ${mate.dorm})`);
});
// Output:
// Beimnet Zelalem Desta - Meng (Dorm 44)
// Eyerus Tesfaye Garedew - Meng (Dorm 44)
// Hlina Solomon Maru - Meng (Dorm 44)
// Iftu Berhanu Dabali - Meng (Dorm 44)
// Kemer Emam Essa - Meng (Dorm 44)
```

---

### 3. Search by Name (Prefix Matching)

All search tokens match the beginning of words in the student's name:

```javascript
// Search for Dagim Alemu in Software Engineering:
const sweResults = sdk.search({
  name: 'dagim alemu',
  dept: 'SWE',
  campus: 'Main'
});
console.log(`Found ${sweResults.total} match(es):`);
sweResults.results.forEach((s) => console.log(`- ${s.name} (${s.id})`));
// - Dagim Alemu Alolo (0276/15)

// Search for Elbetel in Mechanical Engineering (Meng):
const mengResults = sdk.search({
  name: 'elbetel',
  dept: 'Meng',
  campus: 'Hit'
});
console.log(`Found ${mengResults.total} match(es):`);
mengResults.results.forEach((s) => console.log(`- ${s.name} (${s.id})`));
// - Elbetel Taye Ladankilet (1228/18)
```

---

### 4. Filter by Campus, Department, Sex, Year, or Building

Combine multiple criteria easily:

```javascript
// Find 5th-year Software Engineering students on Main campus:
const sweStudents = sdk.search({
  dept: 'SWE',
  campus: 'Main',
  year: '5th'
});
console.log(`Total 5th year SWE students: ${sweStudents.total}`);

// Find 2nd-year female Mechanical Engineering students:
const femaleMechStudents = sdk.search({
  dept: 'Meng',
  sex: 'F',
  year: '2nd'
});
console.log(`Matched: ${femaleMechStudents.total}`);
```

---

### 5. OR Queries (Multiple Values) & Pagination

Pass an array to any filter field:

```javascript
const engineeringStudents = sdk.search({
  dept: ['SWE', 'Meng'],
  campus: ['Main', 'Hit'],
  limit: 10,
  offset: 0
});

console.log(`Total matching students: ${engineeringStudents.total}`);
console.log(`Current page results: ${engineeringStudents.results.length}`);
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
| `id` | `string` | Student ID (e.g. `'0276/15'`, `'1228/18'`) |
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

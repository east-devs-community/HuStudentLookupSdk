const test = require('node:test');
const assert = require('node:assert');
const { HuStdLookupSdk, DormSDK, FILTER_FIELDS } = require('./src');
const DefaultHuStdLookupSdk = require('./src');

test('exports both HuStdLookupSdk and legacy DormSDK alias', () => {
  assert.strictEqual(HuStdLookupSdk.name, 'HuStdLookupSdk');
  assert.strictEqual(DormSDK, HuStdLookupSdk);
  assert.strictEqual(DefaultHuStdLookupSdk, HuStdLookupSdk);
  assert.ok(Array.isArray(FILTER_FIELDS));
});

const sdk = HuStdLookupSdk.load();

test('getById is case/space-insensitive', () => {
  assert.strictEqual(sdk.getById(' 1175/15 ').name, 'Adane Absaye Ayle');
  assert.strictEqual(sdk.getById('UGPR1175/15').name, 'Adane Absaye Ayle'); // prefix ignored
  assert.strictEqual(sdk.getById('nope'), null);
});

test('name prefix search, all words must match', () => {
  const r = sdk.search({ name: 'abdurezak wash' });
  assert.ok(r.total >= 1 && r.results[0].id === '1137/15');
});

test('filters combine and match brute force', () => {
  const q = { dept: 'law', campus: 'main', sex: 'F' };
  const brute = sdk.records.filter((r) => r.dept.toLowerCase() === 'law' && r.campus === 'Main' && r.sex === 'F');
  assert.strictEqual(sdk.search({ ...q, limit: 1e6 }).total, brute.length);
});

test('array = OR, pagination', () => {
  const both = sdk.search({ campus: ['Hit', 'Harar'], limit: 5, offset: 10 });
  assert.strictEqual(both.total, 2650 + 2575);
  assert.strictEqual(both.results.length, 5);
});

test('vet case variants are merged', () => {
  assert.strictEqual(sdk.search({ campus: 'vet' }).total, 186);
});

test('no match', () => {
  assert.deepStrictEqual(sdk.search({ name: 'zzzzqq' }), { total: 0, results: [] });
});

test('dormmates: ids of same-room students, excluding self, all resolvable', () => {
  const s = sdk.getById('1175/15');
  assert.ok(Array.isArray(s.dormmates) && s.dormmates.length > 0);
  assert.ok(!s.dormmates.includes(s.id));
  for (const id of s.dormmates) {
    const m = sdk.getById(id);
    assert.ok(m && m.campus === s.campus && m.building === s.building && m.dorm === s.dorm);
  }
  assert.ok(sdk.getById('0493/15#2')); // duplicate-ID row still reachable by its key
});

test('getDormmates helper resolves roommate student records', () => {
  const mates = sdk.getDormmates('1175/15');
  assert.ok(Array.isArray(mates) && mates.length > 0);
  const s = sdk.getById('1175/15');
  assert.strictEqual(mates.length, s.dormmates.length);
  for (const mate of mates) {
    assert.strictEqual(mate.campus, s.campus);
    assert.strictEqual(mate.building, s.building);
    assert.strictEqual(mate.dorm, s.dorm);
    assert.notStrictEqual(mate.id, s.id);
  }
  assert.deepStrictEqual(sdk.getDormmates('invalid_id'), []);
});

test('facets returns counts and distinct values', () => {
  const campuses = sdk.facets('campus');
  assert.ok(campuses.length >= 4);
  const campusNames = campuses.map((c) => c.value.toLowerCase());
  assert.ok(campusNames.includes('harar'));
  assert.ok(campusNames.includes('hit'));
  assert.ok(campusNames.includes('main'));
});

test('load and constructor use predefined dataset from src/data.json without arguments', () => {
  const loaded = HuStdLookupSdk.load();
  assert.strictEqual(loaded.size, 12322);
  const direct = new HuStdLookupSdk();
  assert.strictEqual(direct.size, 12322);
});
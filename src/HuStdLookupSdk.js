'use strict';


/**
 * HuStdLookupSdk - high-performance lookups and search over Haramaya University
 * student placement and dormitory records.
 *
 * Performance features:
 *   - getById      -> Map<id, record> (hash table), O(1)
 *   - filters      -> Map<value, sortedRowIds[]> per field (inverted index)
 *   - name search  -> Map<token, sortedRowIds[]> + sorted token array
 *                     (binary search finds all tokens sharing a prefix)
 *   - combining    -> intersect sorted arrays, smallest first
 */

const FILTER_FIELDS = ['sex', 'dept', 'campus', 'building', 'year', 'dorm'];

const norm = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
// IDs are stored without the "UGPR" prefix; strip it from user input too.
const normId = (v) => norm(v).replace(/^ugpr/, '');
const tokenize = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// First index in sorted `arr` whose value is >= x.
function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

// Intersect two sorted int arrays; binary-searches the larger one when sizes differ a lot.
function intersect(a, b) {
  if (a.length > b.length) [a, b] = [b, a];
  const out = [];
  if (b.length > a.length * 16) {
    let from = 0;
    for (let i = 0; i < a.length; i++) {
      from = lowerBound(b, a[i]);
      if (from === b.length) break;
      if (b[from] === a[i]) out.push(a[i]);
    }
    return out;
  }
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++;
    else j++;
  }
  return out;
}

// Union of many sorted posting lists -> one sorted list (bitmap keeps it O(n + k)).
function union(lists, size) {
  if (lists.length === 1) return lists[0];
  const mark = new Uint8Array(size);
  for (const l of lists) for (let i = 0; i < l.length; i++) mark[l[i]] = 1;
  const out = [];
  for (let i = 0; i < size; i++) if (mark[i]) out.push(i);
  return out;
}

class HuStdLookupSdk {
  /**
   * @param {{students: Object<string, {id:string,name:string,sex:string,dept:string,campus:string,building:string,dorm:string,year:string,dormmates?:string[]}>,
   *          campuses?: string[], departments?: string[]}|Array<object>} [data]
   */
  constructor(data = require('./data.json')) {
    const isArr = Array.isArray(data);
    const entries = isArr ? data.map((r) => [r.id, r]) : Object.entries(data.students || {});
    const records = entries.map((e) => e[1]);
    this.byId = new Map();
    // key -> record itself. Keys are unique, so dormmates ids like "0493/15#S1414" resolve too.
    // Duplicate real IDs: the first one keeps the plain id.
    for (const [key, r] of entries) {
      const k = normId(key);
      if (k && !this.byId.has(k)) this.byId.set(k, r);
    }
    records.sort((a, b) => (a.name || '').localeCompare(b.name || '')); // search results come back A-Z by name
    this.records = records;
    this.size = records.length;
    this.fieldIndex = {};
    for (const f of FILTER_FIELDS) this.fieldIndex[f] = new Map();
    this.tokenIndex = new Map();

    records.forEach((r, i) => {
      for (const f of FILTER_FIELDS) {
        const k = norm(r[f]);
        const m = this.fieldIndex[f];
        const list = m.get(k);
        list ? list.push(i) : m.set(k, [i]); // rows visited in order => lists stay sorted
      }

      for (const t of new Set(tokenize(r.name))) {
        const list = this.tokenIndex.get(t);
        list ? list.push(i) : this.tokenIndex.set(t, [i]);
      }
    });
    this.sortedTokens = [...this.tokenIndex.keys()].sort();
    // dropdown lists (from the file when present, otherwise derived)
    this.campuses = (data && data.campuses) || this.facets('campus').map((f) => f.value).sort();
    this.departments = (data && data.departments) || this.facets('dept').map((f) => f.value).sort();
  }

  /**
   * Load SDK with predefined dataset from data.json.
   * @returns {HuStdLookupSdk}
   */
  static load() {
    return new HuStdLookupSdk(require('./data.json'));
  }

  /**
   * O(1) lookup. Case/space-insensitive; a leading "UGPR" is ignored. Returns the record or null.
   * @param {string} id Student ID (e.g. "1175/15" or "UGPR1175/15")
   * @returns {object|null}
   */
  getById(id) {
    return this.byId.get(normId(id)) || null;
  }

  /**
   * Return array of student records for the roommates of the given student ID, excluding self.
   * @param {string} id Student ID
   * @returns {object[]}
   */
  getDormmates(id) {
    const s = this.getById(id);
    if (!s || !Array.isArray(s.dormmates)) return [];
    return s.dormmates.map((mid) => this.getById(mid)).filter(Boolean);
  }

  /**
   * Search by name and/or filters.
   * @param {object} [q={}]
   * @param {string} [q.name]       every word must match the START of a name word ("abd wash")
   * @param {string|string[]} [q.sex|dept|campus|building|year|dorm]  exact (case-insensitive); array = OR
   * @param {number} [q.limit=50]
   * @param {number} [q.offset=0]
   * @returns {{total:number, results:object[]}}
   */
  search(q = {}) {
    const { name, limit = 50, offset = 0 } = q;
    const lists = [];

    for (const f of FILTER_FIELDS) {
      if (q[f] == null || q[f] === '') continue;
      const vals = Array.isArray(q[f]) ? q[f] : [q[f]];
      const found = vals.map((v) => this.fieldIndex[f].get(norm(v))).filter(Boolean);
      if (!found.length) return { total: 0, results: [] };
      lists.push(union(found, this.size));
    }

    if (name) {
      for (const word of tokenize(name)) {
        const hits = [];
        for (let i = lowerBound(this.sortedTokens, word); i < this.sortedTokens.length; i++) {
          const t = this.sortedTokens[i];
          if (!t.startsWith(word)) break;
          hits.push(this.tokenIndex.get(t));
        }
        if (!hits.length) return { total: 0, results: [] };
        lists.push(union(hits, this.size));
      }
    }

    let ids;
    if (!lists.length) {
      ids = null; // no criteria: everything
    } else {
      lists.sort((a, b) => a.length - b.length);
      ids = lists[0];
      for (let i = 1; i < lists.length && ids.length; i++) ids = intersect(ids, lists[i]);
    }

    const total = ids ? ids.length : this.size;
    const end = Math.min(total, offset + limit);
    const results = [];
    for (let i = offset; i < end; i++) results.push(this.records[ids ? ids[i] : i]);
    return { total, results };
  }

  /**
   * Distinct values for a filter field, e.g. facets('campus'). Handy for dropdowns and counts.
   * @param {string} field One of 'sex', 'dept', 'campus', 'building', 'year', 'dorm'
   * @returns {Array<{value: string, count: number}>}
   */
  facets(field) {
    const m = this.fieldIndex[field];
    if (!m) throw new Error(`Unknown field "${field}". Use one of: ${FILTER_FIELDS.join(', ')}`);
    return [...m.entries()]
      .map(([k, ids]) => ({ value: this.records[ids[0]][field], count: ids.length }))
      .sort((a, b) => b.count - a.count);
  }
}

const DormSDK = HuStdLookupSdk;

module.exports = HuStdLookupSdk;
module.exports.HuStdLookupSdk = HuStdLookupSdk;
module.exports.DormSDK = DormSDK;
module.exports.FILTER_FIELDS = FILTER_FIELDS;
module.exports.default = HuStdLookupSdk;

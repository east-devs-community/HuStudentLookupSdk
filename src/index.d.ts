export interface StudentRecord {
  id: string;
  name: string;
  sex: 'M' | 'F' | string;
  dept: string;
  campus: 'Harar' | 'Hit' | 'Main' | 'VET' | string;
  building: string;
  dorm: string;
  year: string;
  dormmates?: string[];
  [key: string]: any;
}

export type FilterField = 'sex' | 'dept' | 'campus' | 'building' | 'year' | 'dorm';

export interface SearchQuery {
  name?: string;
  sex?: string | string[];
  dept?: string | string[];
  campus?: string | string[];
  building?: string | string[];
  year?: string | string[];
  dorm?: string | string[];
  limit?: number;
  offset?: number;
  [key: string]: any;
}

export interface SearchResult {
  total: number;
  results: StudentRecord[];
}

export interface FacetResult {
  value: string;
  count: number;
}

export interface HuStdLookupData {
  students: Record<string, StudentRecord> | StudentRecord[];
  campuses?: string[];
  departments?: string[];
}

export class HuStdLookupSdk {
  records: StudentRecord[];
  size: number;
  campuses: string[];
  departments: string[];

  constructor(data?: HuStdLookupData | StudentRecord[]);

  /**
   * Load SDK with predefined data from data.json.
   */
  static load(): HuStdLookupSdk;

  /**
   * O(1) lookup by student ID. Case/space-insensitive; leading 'UGPR' prefix is stripped.
   */
  getById(id: string): StudentRecord | null;

  /**
   * Return array of student records for the roommates of the given student ID, excluding self.
   */
  getDormmates(id: string): StudentRecord[];

  /**
   * Fast prefix and multi-field filtered search.
   */
  search(query?: SearchQuery): SearchResult;

  /**
   * Distinct values and counts for a filter field. Useful for dropdowns and analytics.
   */
  facets(field: FilterField | string): FacetResult[];
}

export const FILTER_FIELDS: readonly ['sex', 'dept', 'campus', 'building', 'year', 'dorm'];
export const DormSDK: typeof HuStdLookupSdk;

export default HuStdLookupSdk;

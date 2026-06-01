/** Shared, cross-feature types. Keep feature-specific types inside their feature. */

export type ID = string;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

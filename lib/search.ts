export type SearchParams = Record<string, string | string[] | undefined>;

export function searchValue(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function containsInsensitive(value: string | undefined) {
  return value ? { contains: value.trim() } : undefined;
}

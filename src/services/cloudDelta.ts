import type { CloudRecord } from './cloudRecords';

type FetchPage = (after: string, until: string | null) => Promise<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;
const isCursor = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d{0,18})$/.test(value);

export async function fetchCloudDelta(after: string, fetchPage: FetchPage) {
  if (!isCursor(after)) throw new Error('Invalid local sync cursor.');
  let boundary: string | null = null;
  let pageCursor = after;
  const records: CloudRecord[] = [];
  for (;;) {
    const { data, error } = await fetchPage(pageCursor, boundary);
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    const page = data as { until?: unknown; next?: unknown; records?: unknown } | null;
    if (!page || !isCursor(page.until) || !Array.isArray(page.records) || page.records.length > 500 ||
        BigInt(page.until) < BigInt(pageCursor) || (boundary !== null && page.until !== boundary))
      throw new Error('Cloud sync returned an invalid page.');
    boundary = page.until;
    let last = BigInt(pageCursor);
    for (const value of page.records) {
      const row = value as CloudRecord & { sync_revision: string | number };
      const revision = String(row?.sync_revision);
      if (!row || !isCursor(revision) || BigInt(revision) <= last || BigInt(revision) > BigInt(boundary) ||
          !['food', 'weight', 'water', 'goals', 'profile', 'preferences'].includes(row.entity) ||
          typeof row.record_key !== 'string' || typeof row.deleted !== 'boolean' ||
          !Number.isSafeInteger(Number(row.version)) || Number(row.version) < 1 ||
          (!row.deleted && (!row.payload || typeof row.payload !== 'object')))
        throw new Error('Cloud sync returned an invalid record.');
      last = BigInt(revision);
      records.push(row);
    }
    if (page.next === null) return { records, cursor: boundary };
    if (!isCursor(page.next) || BigInt(page.next) <= BigInt(pageCursor) || BigInt(page.next) !== last)
      throw new Error('Cloud sync returned an invalid continuation.');
    pageCursor = page.next;
  }
}

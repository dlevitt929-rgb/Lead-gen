/**
 * Runs `fn` over `items` with at most `limit` in flight at once. Unlike
 * Promise.all, one item throwing never aborts the others — each result is
 * reported individually so a single bad record can't take down an entire
 * batch (e.g. one malformed business shouldn't fail a whole search).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<{ item: T; index: number; result?: R; error?: unknown }[]> {
  const results: { item: T; index: number; result?: R; error?: unknown }[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      try {
        const result = await fn(item, index);
        results[index] = { item, index, result };
      } catch (error) {
        results[index] = { item, index, error };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

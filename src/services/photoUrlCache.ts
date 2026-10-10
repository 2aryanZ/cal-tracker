type SignedPath = { path: string; url?: string | null; error?: string | null };
type Signer = (paths: string[], seconds: number) => Promise<SignedPath[]>;
const TTL_SECONDS = 86400;
const REFRESH_MARGIN_MS = 300000;
const MAX_CACHE = 2000;

export class PhotoUrlCache {
  private owner = '';
  private urls = new Map<string, { url: string; expires: number }>();
  constructor(private now: () => number = Date.now) {}

  async resolve(owner: string, paths: string[], sign: Signer): Promise<Map<string, string>> {
    if (owner !== this.owner) {
      this.owner = owner;
      this.urls.clear();
    }
    const result = new Map<string, string>();
    const missing: string[] = [];
    for (const path of new Set(paths)) {
      if (owner === 'guest' || path.split('/')[0] !== owner) throw new Error('Photo belongs to another account.');
      const cached = this.urls.get(path);
      if (cached && cached.expires > this.now() + REFRESH_MARGIN_MS) result.set(path, cached.url);
      else missing.push(path);
    }
    // Bounded batches avoid oversized Storage requests for large photo journals.
    for (let start = 0; start < missing.length; start += 100) {
      const batch = missing.slice(start, start + 100);
      const expires = this.now() + TTL_SECONDS * 1000;
      const signed = new Map((await sign(batch, TTL_SECONDS)).map(item => [item.path, item]));
      for (const path of batch) {
        const item = signed.get(path);
        if (!item?.url || item.error) throw new Error('Unable to load a private meal photo. Try syncing again.');
        result.set(path, item.url);
        if (this.owner === owner) this.urls.set(path, { url: item.url, expires });
      }
      while (this.urls.size > MAX_CACHE) this.urls.delete(this.urls.keys().next().value!);
    }
    return result;
  }
}

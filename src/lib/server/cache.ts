/**
 * Dead-simple in-memory TTL cache. Upstream data changes once a patch (static
 * assets) or a few times a day (build stats), so there is no reason to hit the
 * network on every request — and every reason not to.
 */
const store = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const hit = store.get(key);
	if (hit && hit.expires > Date.now()) return hit.value as T;

	// Collapse concurrent misses for the same key into one upstream request.
	const existing = inflight.get(key);
	if (existing) return existing as Promise<T>;

	const promise = load()
		.then((value) => {
			store.set(key, { value, expires: Date.now() + ttlMs });
			return value;
		})
		.finally(() => {
			inflight.delete(key);
		});

	inflight.set(key, promise);
	return promise;
}

export const HOUR = 60 * 60 * 1000;

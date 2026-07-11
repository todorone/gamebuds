import { drizzle } from 'drizzle-orm/d1';

import type { WorkerBindings } from '../worker-env.js';

export function createDb(bindings: Pick<WorkerBindings, 'DB'>) {
	return drizzle(bindings.DB);
}

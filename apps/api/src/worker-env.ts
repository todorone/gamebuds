import type { AppBindings } from './env.js';

export interface WorkerBindings extends AppBindings {
	DB: D1Database;
}

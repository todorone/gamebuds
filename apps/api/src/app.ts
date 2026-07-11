import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

import { isAllowedOrigin } from './cors.js';
import type { AppEnv } from './env.js';
import { splitSignalRoutes } from './prototypes/split-signal.js';

const originGuard: MiddlewareHandler<AppEnv> = async (context, next) => {
	const origin = context.req.header('Origin');

	if (origin && !isAllowedOrigin(context, origin)) {
		return context.json({ error: 'Origin not allowed' }, 403);
	}

	await next();
};

const corsMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
	return cors({
		origin: (origin) => (isAllowedOrigin(context, origin) ? origin : ''),
	})(context, next);
};

export const app = new Hono<AppEnv>()
	.use('*', originGuard)
	.use('*', corsMiddleware)
	.get('/health', (context) => context.json({ status: 'ok' as const }))
	.route('/prototype/split-signal', splitSignalRoutes);

export type AppType = typeof app;

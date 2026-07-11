import type { Context } from 'hono';

import type { AppEnv } from './env.js';

export const DEFAULT_CLIENT_ORIGINS = [
	'http://localhost:5173',
	'http://localhost:4173',
	'capacitor://localhost',
	'http://localhost',
	'https://localhost',
];

export function getAllowedOrigins(env: AppEnv['Bindings']): Set<string> {
	const configuredOrigins = env.CORS_ORIGINS?.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return new Set(
		configuredOrigins?.length ? configuredOrigins : DEFAULT_CLIENT_ORIGINS,
	);
}

export function isAllowedOrigin(
	context: Context<AppEnv>,
	origin: string,
): boolean {
	return getAllowedOrigins(context.env).has(origin);
}

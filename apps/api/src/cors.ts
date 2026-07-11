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

function hasExplicitOrigins(env: AppEnv['Bindings']): boolean {
	return Boolean(env.CORS_ORIGINS?.split(',').some((origin) => origin.trim()));
}

function isLocalhostOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		return (
			(url.protocol === 'http:' || url.protocol === 'https:') &&
			url.hostname === 'localhost'
		);
	} catch {
		return false;
	}
}

export function isAllowedOrigin(
	context: Context<AppEnv>,
	origin: string,
): boolean {
	return (
		getAllowedOrigins(context.env).has(origin) ||
		(!hasExplicitOrigins(context.env) && isLocalhostOrigin(origin))
	);
}

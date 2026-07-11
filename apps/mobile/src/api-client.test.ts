import { describe, expect, it } from 'vitest';

import { apiClient } from './api-client';

describe('API client configuration', () => {
	it('exposes the typed health route from the API workspace', () => {
		expect(apiClient.health.$get).toBeTypeOf('function');
	});
});

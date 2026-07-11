import { createApiClient } from '@gamebuds/api/client';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export const apiClient = createApiClient(apiUrl);

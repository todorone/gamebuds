import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	{
		ignores: [
			'.claude/**',
			'**/dist/**',
			'**/node_modules/**',
			'**/.wrangler/**',
			'apps/mobile/android/**',
			'apps/mobile/ios/**',
		],
	},
	{
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
	},
);

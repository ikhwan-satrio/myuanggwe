import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, 'src/types/*.d.ts']
			})
		},
		alias: {
			'#server/*': 'src/lib/server/rest-api/*'
		},
		adapter: adapter()
	}
};

export default config;

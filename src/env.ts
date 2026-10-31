import { defineEnvVars } from '@sveltejs/kit/env';

const required = (name: string) => (value: string | undefined) => {
	if (!value) throw new Error(`${name} is not set — copy .env.example to .env`);
	return value;
};

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		static: true,
		description: 'Supabase project URL',
		schema: required('PUBLIC_SUPABASE_URL')
	},
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		static: true,
		description: 'Supabase publishable (anon) key — safe to expose; data is protected by RLS',
		schema: required('PUBLIC_SUPABASE_PUBLISHABLE_KEY')
	}
});

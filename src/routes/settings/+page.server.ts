import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const COOKIE_NAME = 'openai_model';

const ALLOWED_MODELS = ['gpt-5-mini', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1'] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function normalizeModel(value: unknown): AllowedModel {
	if (typeof value !== 'string') return 'gpt-5-mini';
	return (ALLOWED_MODELS as readonly string[]).includes(value) ? (value as AllowedModel) : 'gpt-5-mini';
}

export const load: PageServerLoad = async ({ cookies }) => {
	return {
		model: normalizeModel(cookies.get(COOKIE_NAME)),
		allowedModels: ALLOWED_MODELS
	};
};

export const actions: Actions = {
	setModel: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const model = normalizeModel(form.get('model'));

		cookies.set(COOKIE_NAME, model, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});

		throw redirect(303, '/settings?saved=1');
	}
};


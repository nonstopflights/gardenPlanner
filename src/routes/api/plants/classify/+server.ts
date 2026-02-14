import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import * as queries from '$lib/db/queries';
import { classifyPlantTypes, type OpenAIModelId } from '$lib/services/openaiEnrichment';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const allPlants = await queries.getAllPlants();
		const untagged = allPlants
			.filter((p) => !p.plantType)
			.map((p) => ({ id: p.id, name: p.name, variety: p.variety }));

		if (untagged.length === 0) {
			return json({ classified: 0 });
		}

		const model = cookies.get('openai_model') as OpenAIModelId | undefined;
		const typeMap = await classifyPlantTypes(untagged, model);

		let classified = 0;
		for (const [idStr, plantType] of Object.entries(typeMap)) {
			const id = parseInt(idStr);
			if (!isNaN(id) && plantType) {
				await queries.updatePlant(id, { plantType });
				classified++;
			}
		}

		return json({ classified, typeMap });
	} catch (error) {
		console.error('Failed to classify plants:', error);
		return json({ error: 'Classification failed' }, { status: 500 });
	}
};

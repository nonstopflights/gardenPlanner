import { writable } from 'svelte/store';
import type { Season } from '$lib/db/queries';

export const activeSeason = writable<Season | null>(null);
export const allSeasons = writable<Season[]>([]);

export async function loadSeasons() {
	const res = await fetch('/api/seasons');
	const seasons: Season[] = await res.json();
	allSeasons.set(seasons);
	const active = seasons.find((s) => s.isActive) || seasons[0] || null;
	activeSeason.set(active);
	return { seasons, active };
}

export async function switchSeason(seasonId: number) {
	await fetch(`/api/seasons/${seasonId}/activate`, { method: 'POST' });
	return loadSeasons();
}

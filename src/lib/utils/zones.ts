export type Zone = 'top-left' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-right' | 'center';

export const ZONES: Zone[] = [
	'top-left',
	'top-right',
	'center-left',
	'center-right',
	'bottom-left',
	'bottom-right',
	'center'
];

export function getZonePosition(zone: Zone): { top: string; left: string } {
	const positions: Record<Zone, { top: string; left: string }> = {
		'top-left': { top: '10%', left: '10%' },
		'top-right': { top: '10%', left: '80%' },
		'center-left': { top: '45%', left: '10%' },
		'center-right': { top: '45%', left: '80%' },
		'bottom-left': { top: '80%', left: '10%' },
		'bottom-right': { top: '80%', left: '80%' },
		center: { top: '45%', left: '45%' }
	};
	return positions[zone];
}

export function getAvailableZones(occupiedZones: Zone[]): Zone[] {
	return ZONES.filter((zone) => !occupiedZones.includes(zone));
}

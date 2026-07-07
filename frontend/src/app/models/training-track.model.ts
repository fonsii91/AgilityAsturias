export type TrainingTrackSurface = 'tierra' | 'cesped' | 'cesped_artificial' | 'otro';

export const SURFACE_OPTIONS: { value: TrainingTrackSurface; label: string }[] = [
    { value: 'tierra', label: 'Tierra' },
    { value: 'cesped', label: 'Césped' },
    { value: 'cesped_artificial', label: 'Césped artificial' },
    { value: 'otro', label: 'Otro' }
];

export function surfaceLabel(surface: TrainingTrackSurface | string | null | undefined): string {
    return SURFACE_OPTIONS.find(o => o.value === surface)?.label ?? 'Otro';
}

export interface TrainingTrack {
    id: number;
    name: string;
    surface: TrainingTrackSurface;
    photo_url?: string | null;
    club_id?: number;
}

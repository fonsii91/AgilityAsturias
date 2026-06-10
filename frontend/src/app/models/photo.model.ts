export interface PhotoTag {
    id: number;
    name: string;
}

export interface Photo {
    id: number;
    club_id: number;
    user_id: number | null;
    competition_id: number | null;
    category: string;
    photo_type: string | null;
    title: string | null;
    taken_at: string;
    url: string | null;
    thumb_url: string | null;
    size_bytes: number;
    is_public: boolean;
    created_at: string;
    user?: PhotoTag;
    competition?: { id: number; nombre: string; fechaEvento?: string };
    dogs?: PhotoTag[];
    tagged_users?: PhotoTag[];
}

export interface PhotoStorageStats {
    used_bytes: number;
    limit_bytes: number;
    limit_gb: number;
    percentage: number;
}

export const PHOTO_CATEGORIES: { value: string; label: string; icon: string }[] = [
    { value: 'entrenamiento', label: 'Entrenamiento', icon: 'fitness_center' },
    { value: 'competicion', label: 'Competición', icon: 'emoji_events' },
    { value: 'seminario', label: 'Seminario / Taller', icon: 'school' },
    { value: 'evento_social', label: 'Evento social', icon: 'celebration' },
    { value: 'cachorros', label: 'Cachorros y nuevos miembros', icon: 'pets' },
    { value: 'instalaciones', label: 'Instalaciones y pistas', icon: 'home_work' },
    { value: 'otros', label: 'Otros', icon: 'category' },
];

export const PHOTO_TYPES: { value: string; label: string; icon: string }[] = [
    { value: 'podio', label: 'Podio', icon: 'military_tech' },
    { value: 'perro_en_accion', label: 'Perro en acción', icon: 'directions_run' },
    { value: 'binomio', label: 'Binomio (guía y perro)', icon: 'group' },
    { value: 'grupo', label: 'Foto de grupo', icon: 'groups' },
    { value: 'retrato', label: 'Retrato', icon: 'portrait' },
    { value: 'ambiente', label: 'Ambiente / Backstage', icon: 'festival' },
    { value: 'otras', label: 'Otras', icon: 'photo' },
];

export function photoCategoryLabel(value: string | null): string {
    return PHOTO_CATEGORIES.find(c => c.value === value)?.label ?? value ?? '';
}

export function photoTypeLabel(value: string | null): string {
    return PHOTO_TYPES.find(t => t.value === value)?.label ?? value ?? '';
}

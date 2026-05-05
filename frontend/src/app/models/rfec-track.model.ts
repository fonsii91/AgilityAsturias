export interface RfecTrack {
    id?: number;
    dog_id: number;
    club_id?: number;
    date: string; // ISO format string
    manga_type: string; // e.g. 'Agility', 'Jumping'
    qualification: string; // e.g. 'Excelente', 'Muy Bueno', 'Bueno', 'No Clasificado', 'Eliminado'
    speed?: number | null;
    judge_name?: string | null;
    location?: string | null;
    notes?: string | null;
    grade?: string | null;
    created_at?: string;
    updated_at?: string;
}

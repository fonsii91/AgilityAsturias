export interface RsceTrack {
    id?: number;
    dog_id: number;
    date: Date | string;
    manga_type: 'Agility 1' | 'Agility 2' | 'Jumping 1' | 'Jumping 2' | 'Otra' | string;
    qualification: string;
    speed?: number | null;
    judge_name?: string | null;
    location?: string | null;
    notes?: string | null;
    created_at?: Date | string;
    updated_at?: Date | string;
}

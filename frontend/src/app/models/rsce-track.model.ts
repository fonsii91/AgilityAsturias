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
    time?: number | null;
    faults?: number | null;
    refusals?: number | null;
    time_penalty?: number | null;
    total_penalty?: number | null;
    is_clean?: boolean | number | null;
    course_length?: number | null;
    standard_time?: number | null;
    created_at?: Date | string;
    updated_at?: Date | string;
}

export interface AdminRsceStats {
    user_id: number;
    name: string;
    email: string;
    total_tracks: number;
    dogs_list: string[];
}

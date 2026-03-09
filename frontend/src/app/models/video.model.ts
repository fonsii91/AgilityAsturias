import { Dog } from './dog.model';
import { User } from '../services/auth.service';
import { Competition } from './competition.model';

export interface Video {
    id: number;
    dog_id: number;
    user_id: number;
    competition_id?: number | null;
    date: string;
    title?: string;
    local_path?: string;
    youtube_id?: string;
    status: 'local' | 'in_queue' | 'on_youtube' | 'failed';
    created_at?: string;
    updated_at?: string;
    likes_count?: number;
    is_liked_by_user?: boolean;

    // Relaciones
    dog?: Dog;
    user?: User;
    competition?: Competition;
}

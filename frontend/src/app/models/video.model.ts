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
    status: 'local' | 'in_queue' | 'on_youtube' | 'failed' | 'uploading' | 'processing' | 'completed' | string;
    manga_type?: 'Agility 1' | 'Agility 2' | 'Jumping 1' | 'Jumping 2' | 'Otra' | string;
    orientation?: 'horizontal' | 'vertical';
    created_at?: string;
    updated_at?: string;
    likes_count?: number;
    is_liked_by_user?: boolean;
    is_public?: boolean;
    in_public_gallery?: boolean;
    playback_url?: string | null;
    bitmovin_input_id?: string | null;
    bitmovin_encoding_id?: string | null;
    error_message?: string | null;
    bunny_video_id?: string | null;

    // Relaciones
    dog?: Dog;
    user?: User;
    competition?: Competition;
}

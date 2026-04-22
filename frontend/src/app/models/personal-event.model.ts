export interface PersonalEvent {
    id?: number;
    user_id?: number;
    dog_id: number;
    title: string;
    type: 'veterinario' | 'fisioterapia' | 'otro';
    start_date: string;
    end_date?: string; // Aunque es de 1 día, puede que el backend devuelva null
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

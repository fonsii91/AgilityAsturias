export interface Dog {
    id: number;
    name: string;
    breed?: string; // Raza opcional
    birth_date?: string;
    rsce_category?: string;
    microchip?: string;
    pedigree?: string;
    photo_url?: string;
    avatar_cansancio_1_url?: string;
    avatar_cansancio_2_url?: string;
    avatar_cansancio_3_url?: string;
    avatar_cansancio_4_url?: string;
    avatar_cansancio_5_url?: string;
    has_previous_injuries?: boolean;
    sterilized_at?: string;
    weight_kg?: number;
    height_cm?: number;
    rfec_grade?: string;
    rfec_category?: string;
    pivot?: {
        is_primary_owner: boolean;
        rsce_license?: string;
        rsce_expiration_date?: string;
        rsce_grade?: string;
        sociability_test_passed?: boolean;
    };
    acwr_color?: 'none' | 'gray' | 'blue' | 'green' | 'yellow' | 'red';
    users?: Array<{ 
        id: number; 
        name: string; 
        email?: string; 
        pivot?: { 
            is_primary_owner: boolean;
            rsce_license?: string;
            rsce_expiration_date?: string;
            rsce_grade?: string;
            sociability_test_passed?: boolean;
        } 
    }>;
    points?: number;
    pointHistories?: Array<{
        id: number;
        points: number;
        category: string;
        created_at: string;
    }>;
    createdAt?: string; // Laravel uses timestamps, string
    updatedAt?: string;
}

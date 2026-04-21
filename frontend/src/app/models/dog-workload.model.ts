export interface DogWorkload {
    id: number;
    dog_id: number;
    user_id?: number;
    source_type: 'manual' | 'auto_attendance' | 'auto_competition';
    source_id?: number;
    date: string;
    duration_min: number;
    intensity_rpe: number;
    jumped_max_height?: boolean;
    number_of_runs?: number;
    status: 'confirmed' | 'pending_review' | 'auto_confirmed';
    is_staff_verified?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface AcwrData {
    acwr: number;
    acute_load: number;
    chronic_load: number;
    yellow_threshold: number;
    red_threshold: number;
    calibration_days: number;
    is_calibrating: boolean;
    recent_history: DogWorkload[];
}

export interface AdminWorkloadStats {
    user_id: number;
    name: string;
    email: string;
    total_workloads: number;
    manual_workloads: number;
    auto_workloads: number;
    dogs_list: string[];
}


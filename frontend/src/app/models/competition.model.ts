export interface Competition {
    id: number;
    lugar: string;
    fechaEvento: string;
    fechaFinEvento?: string; // Optional for multi-day events
    fechaLimite: string;
    formaPago: string;
    cartel: string | null;
    enlace: string;
    tipo: 'competicion' | 'otros';
    federacion?: 'RSCE' | 'RFEC' | 'Otro';
    nombre?: string; // Optional for backward compatibility with existing records
    judge_name?: string;

    isAttending?: boolean;
    attendingDogIds?: number[];
    attendingDogsDetails?: {id: number, dias_asistencia: string[]}[];
    allAttendingDogIds?: number[];
    diasAsistencia?: string[];
}

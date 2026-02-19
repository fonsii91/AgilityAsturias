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
    nombre?: string; // Optional for backward compatibility with existing records
}

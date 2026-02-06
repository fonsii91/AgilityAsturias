export interface Competition {
    id: string;
    lugar: string;
    fechaEvento: string;
    fechaLimite: string;
    formaPago: string;
    cartel: string | null;
    enlace: string;
    tipo: 'competicion' | 'otros';
    nombre?: string; // Optional for backward compatibility with existing records
}

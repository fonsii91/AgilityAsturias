export interface Dog {
    id: number;
    userId: number;
    name: string;
    breed?: string; // Raza opcional
    birth_date?: string;
    license_expiration_date?: string;
    microchip?: string;
    pedigree?: string;
    photo_url?: string;
    user?: { id: number; name: string };
    createdAt?: string; // Laravel uses timestamps, string
    updatedAt?: string;
}

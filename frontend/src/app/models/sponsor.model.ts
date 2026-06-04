export interface Sponsor {
  id?: number;
  club_id?: number;
  nombre: string;
  enlace?: string;
  descripcion?: string;
  imagen?: string; // Base64 compressed image string
  created_at?: string;
  updated_at?: string;
}

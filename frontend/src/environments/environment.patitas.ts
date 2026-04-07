export const environment = {
    production: true, // Asumimos que configuraremos su propio pipeline de pre-producción
    apiUrl: 'http://localhost:3000', // Esta URL apuntaría al backend o droplet de Patitas Felices
    clubConfig: {
        name: "Patitas Felices",
        slogan: "Saltando juntos, creando momentos inolvidables.",
        logoPath: "Images/patitas_felices_logo.png", // Solo tendrías que subir esta imagen a los assets
        colors: {
            primary: "#38a169", // Verde naturaleza vibrante (su color principal)
            accent: "#d53f8c",  // Rosa fucsia juguetón (para los botones cruzados / acentos)
            warn: "#EF4444"     // Rojo de error estándar
        },
        social: {
            instagram: "https://www.instagram.com/clubpatitasfelices_mockup/",
            facebook: "https://www.facebook.com/patitasfelicesagility"
        },
        contact: {
            phone: "600 11 22 33",
            whatsappId: "34600112233",
            email: "hola@patitasfelices.es",
            addressLine1: "Polígono Industrial C/ 3 Nave 4",
            addressLine2: "Gijón, Asturias, CP: 33211",
            mapUrl: "https://maps.google.com/maps?q=Polideportivo+Gijon&t=&z=15&ie=UTF8&iwloc=&output=embed"
        }
    }
};

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
        },
        homeConfig: {
            heroImage: "Images/Perros/Pumba.jpeg",
            services: {
                title: "Nuestros Servicios",
                subtitle: "Descubre todo lo que ofrecemos para ti y tu perro.",
                items: [
                    { icon: "school", title: "Iniciación", description: "Aprende las bases del Agility guiado por profesionales. Construye una conexión única desde el primer día con nuestro método positivo." },
                    { icon: "emoji_events", title: "Competición", description: "Pistas oficiales y material homologado. Perfecciona tus trazados y prepárate para brillar en competiciones regionales y nacionales." },
                    { icon: "pets", title: "Escuela de Cachorros", description: "Socialización, obediencia básica y juegos divertidos para que tu cachorro crezca seguro, feliz y equilibrado." },
                    { icon: "group", title: "Hazte Socio", description: "Únete a nuestra gran familia. Disfruta del acceso a nuestras instalaciones completas y forma parte del equipo organizativo." }
                ]
            },
            features: [
                { icon: "favorite", title: "Vínculo", description: "Refuerza la relación de confianza mutua con tu perro a través del trabajo en equipo y la diversión compartida." },
                { icon: "workspace_premium", title: "Competición", description: "Demuestra lo aprendido participando en eventos locales, regionales y nacionales con el apoyo de nuestros expertos." },
                { icon: "park", title: "Naturaleza", description: "Disfruta de nuestras amplias instalaciones de hierba natural en un entorno perfecto y seguro para el deporte canino." }
            ],
            cta: {
                title: "¿Listo para dar el primer salto?",
                subtitle: "Únete a {clubName} y descubre de lo que sois capaces formando equipo."
            }
        }
    }
};

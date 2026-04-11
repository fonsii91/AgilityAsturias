export const environment = {
    production: true,
    firebase: {
        apiKey: "AIzaSyB_9AlTCYi27xFQkP64f5aU4OrQBZ7TE8k",
        authDomain: "agilityasturias-4a107.firebaseapp.com",
        projectId: "agilityasturias-4a107",
        storageBucket: "agilityasturias-4a107.firebasestorage.app",
        messagingSenderId: "898271086134",
        appId: "1:898271086134:web:10e005442180b8d2943a97",
        measurementId: "G-N6SP2XNR7Q"
    },
    apiUrl: '/backend/api',
    clubConfig: {
        name: "Agility Asturias",
        slogan: "Más que un deporte, una conexión única con tu perro.",
        logoPath: "Images/Agility_Asturias_logo.jpg",
        colors: {
            primary: "#0073CF",
            accent: "#f6ae12ff",
            warn: "#EF4444"
        },
        social: {
            instagram: "https://www.instagram.com/agility.asturias/",
            facebook: "https://www.facebook.com/AgilityAsturias/photos"
        },
        contact: {
            phone: "633 48 43 45",
            whatsappId: "34633484345",
            email: "agilityasturias@gmail.com",
            addressLine1: "Antigüo Campo de fútbol La Salle",
            addressLine2: "Langreo, Asturias, CP: 33939",
            mapUrl: "https://maps.google.com/maps?q=Agility+Asturias,+Langreo&t=&z=15&ie=UTF8&iwloc=&output=embed"
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

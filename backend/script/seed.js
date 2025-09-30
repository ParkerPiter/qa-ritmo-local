const { sequelize, Evento, Organizador, Categoria } = require('../schemas');

const tipos = ['Paid', 'Free'];
const generos = [
  'Rock', 'Pop', 'Hip-Hop / Rap', 'R&B / Soul', 'Country', 'EDM (Electronic Dance Music)',
  'Latin (Reggaeton, Latin Pop, Regional Mexican, etc.)', 'Indie / Alternative', 'Metal / Hard Rock',
  'Jazz', 'Blues', 'Folk / Americana', 'Classical / Symphony', 'Punk / Hardcore', 'Reggae',
  'K-Pop / J-Pop', 'Gospel / Christian', 'World Music / Global', 'Singer-Songwriter / Acoustic',
  'Tribute / Cover Bands', 'Comedy (Stand-up / Improv / Variety)'
];
const ubicaciones = ['Los Angeles', 'San Francisco'];

const eventos = [
  {
    title: "Pop Gala 2025",
    date: "2025-08-10 20:00:00",
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Paid',
    genre: 'Pop',
    eventLocation: 'Los Angeles'
  },
  {
    title: "Indie Rock Fest",
    date: "2025-09-05 18:00:00",
    location: "The Fillmore, SF",
    image: "/public/images/card-3.jpg",
    type: 'Paid',
    genre: 'Indie / Alternative',
    eventLocation: 'San Francisco'
  },
  {
    title: "EDM in the Park",
    date: "2025-10-12 22:00:00",
    location: "Golden Gate Park, SF",
    image: "/public/images/musicImg.png",
    type: 'Free',
    genre: 'EDM (Electronic Dance Music)',
    eventLocation: 'San Francisco'
  },
  {
    title: "Band vs Band 2025",
    date: "2025-08-11 16:00:00",
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Free',
    genre: 'Rock',
    eventLocation: 'Los Angeles'
  },
  {
    title: "Punk Rock Fest",
    date: "2025-09-05 18:00:00",
    location: "The Fillmore, SF",
    image: "/public/images/card-3.jpg",
    type: 'Paid',
    genre: 'Punk',
    eventLocation: 'San Francisco'
  },
  {
    title: "BTS Live Concert",
    date: "2025-10-08 22:00:00",
    location: "Golden Gate Park, SF",
    image: "/public/images/musicImg.png",
    type: 'Paid',
    genre: 'K-Pop',
    eventLocation: 'San Francisco'
  }
];

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // Crear Organizadores
    const organizador1 = await Organizador.create({
      email: 'organizador1@example.com',
      nombreCompleto: 'Juan Perez',
      phone: '123456789',
      password: 'password123'
    });

    const organizador2 = await Organizador.create({
      email: 'organizador2@example.com',
      nombreCompleto: 'Maria Rodriguez',
      phone: '987654321',
      password: 'password123'
    });

    // Crear Categorías
    const categoriasCreadas = {};

    for (const nombre of tipos) {
      const cat = await Categoria.create({ nombre, tipo: 'TYPE' });
      categoriasCreadas[nombre] = cat;
    }
    for (const nombre of generos) {
      const cat = await Categoria.create({ nombre, tipo: 'GENRE' });
      categoriasCreadas[nombre] = cat;
    }
    for (const nombre of ubicaciones) {
      const cat = await Categoria.create({ nombre, tipo: 'LOCATION' });
      categoriasCreadas[nombre] = cat;
    }

    console.log('Categories seeded!');

    // Crear Eventos
    for (const eventoData of eventos) {
        const newEvento = await Evento.create({
            titulo: eventoData.title,
            ubicacion: eventoData.location,
            fecha: new Date(eventoData.date),
            galeriaImagenes: [eventoData.image],
            descripcion: `An amazing ${eventoData.title}.`,
            organizadorId: Math.random() > 0.5 ? organizador1.id : organizador2.id,
            precio: eventoData.type === 'Free' ? 0 : Math.floor(Math.random() * 100) + 20,
        });

        console.log(`\nAssociating categories for event: ${eventoData.title}`);

        // Lista de categorías a asociar
        const categoriasParaAsociar = [
            eventoData.type,
            eventoData.genre,
            eventoData.eventLocation
        ];

        for (const nombreCategoria of categoriasParaAsociar) {
            const categoria = categoriasCreadas[nombreCategoria];
            if (categoria) {
            await newEvento.addCategoria(categoria);
            console.log(`  - Successfully associated category: "${nombreCategoria}"`);
            } else {
            // Esta advertencia es clave para la depuración
            console.warn(`  - WARNING: Category "${nombreCategoria}" not found. Skipping association.`);
            }
        }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
}

seed();

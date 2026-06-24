const bcrypt = require('bcryptjs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { sequelize, Evento, Organizador, Categoria, Admin, User } = require('../schemas');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Precarga las imágenes locales del seed a Cloudinary.
 * Sube cada imagen única una sola vez con un public_id fijo y overwrite:true
 * (idempotente: re-ejecutar el seed no genera duplicados).
 *
 * @returns {Promise<Map<string, {url: string, publicId: string}>|null>}
 *   Mapa rutaLocal -> { url, publicId }. Devuelve null si Cloudinary no está
 *   configurado o si falla la subida (el seed cae a rutas locales).
 */
async function uploadSeedImagesToCloudinary(localImagePaths) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  Cloudinary no configurado. El seed usará rutas locales para las imágenes.');
    return null;
  }

  const uniquePaths = [...new Set(localImagePaths)];
  const map = new Map();

  try {
    for (const relPath of uniquePaths) {
      // relPath viene como "/public/images/card-2.jpg" → archivo en backend/public/images/...
      const absPath = path.join(__dirname, '..', relPath.replace(/^\//, ''));
      const baseName = path.parse(relPath).name; // "card-2"
      const result = await cloudinary.uploader.upload(absPath, {
        public_id: `seed/${baseName}`,
        folder: 'eventos',
        overwrite: true,
        invalidate: true,
      });
      map.set(relPath, { url: result.secure_url, publicId: result.public_id });
      console.log(`☁️  Imagen precargada en Cloudinary: ${relPath} → ${result.secure_url}`);
    }
    return map;
  } catch (error) {
    console.error('⚠️  Error subiendo imágenes a Cloudinary. Fallback a rutas locales:', error.message);
    return null;
  }
}

const tipos = ['Paid', 'Free'];
const eventCategories = [
  'Live Music', 'DJ Night', 'Comedy', 'Theater', 'Dance',
  'Workshop / Class', 'Art / Exhibition', 'Film Screening',
  'Party / Nightlife', 'Festival', 'Street Fair', 'Fundraiser',
  'Market / Pop-Up', 'Other'
];
const generos = [
  'Rock', 'Pop', 'Hip-Hop / Rap', 'R&B / Soul', 'Country', 'EDM (Electronic Dance Music)',
  'Latin (Reggaeton, Latin Pop, Regional Mexican, etc.)', 'Indie / Alternative', 'Metal / Hard Rock',
  'Jazz', 'Blues', 'Folk / Americana', 'Classical / Symphony', 'Punk / Hardcore', 'Reggae',
  'K-Pop / J-Pop', 'Gospel / Christian', 'World Music / Global', 'Singer-Songwriter / Acoustic',
  'Tribute / Cover Bands', 'Comedy (Stand-up / Improv / Variety)'
];
const ubicaciones = ['Los Angeles', 'San Francisco'];

/**
 * Genera una fecha relativa a HOY (momento en que se corre el seed): hoy + offsetDays,
 * con la hora indicada. Así los eventos del seed siempre quedan vigentes sin tener que
 * editar fechas fijas cada cierto tiempo.
 * @param {number} offsetDays - días desde hoy (negativo = pasado).
 * @param {number} hour - hora (0-23).
 * @returns {Date}
 */
const atDaysFromNow = (offsetDays, hour = 20) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// `daysAhead` = días desde hoy en que ocurre el evento. La ventana de venta se deriva
// en el loop: abre 7 días antes de hoy y cierra 2h antes del evento, de modo que TODOS
// quedan con venta activa al momento de sembrar (siempre que daysAhead >= 1).
const eventos = [
  {
    title: "Pop Gala 2026",
    daysAhead: 5,
    hour: 20,
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Paid',
    genre: 'Pop',
    eventLocation: 'Los Angeles',
    maxTickets: 4,
    categoria: 'Live Music'
  },
  {
    title: "Indie Rock Fest",
    daysAhead: 9,
    hour: 18,
    location: "The Fillmore, SF",
    image: "/public/images/card-3.jpg",
    type: 'Paid',
    genre: 'Indie / Alternative',
    eventLocation: 'San Francisco',
    maxTickets: 6,
    categoria: 'Festival'
  },
  {
    title: "EDM in the Park",
    daysAhead: 12,
    hour: 22,
    location: "Golden Gate Park, SF",
    image: "/public/images/musicImg.png",
    type: 'Free',
    genre: 'EDM (Electronic Dance Music)',
    eventLocation: 'San Francisco',
    maxTickets: null,
    categoria: 'Party / Nightlife'
  },
  {
    title: "Band vs Band 2026",
    daysAhead: 16,
    hour: 16,
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Free',
    genre: 'Rock',
    eventLocation: 'Los Angeles',
    maxTickets: null,
    categoria: 'Live Music'
  },
  {
    title: "Punk Rock Fest",
    daysAhead: 20,
    hour: 18,
    location: "The Fillmore, SF",
    image: "/public/images/card-3.jpg",
    type: 'Paid',
    genre: 'Punk',
    eventLocation: 'San Francisco',
    maxTickets: 2,
    categoria: 'Festival'
  },
  {
    title: "BTS Live Concert",
    daysAhead: 25,
    hour: 22,
    location: "Golden Gate Park, SF",
    image: "/public/images/musicImg.png",
    type: 'Paid',
    genre: 'K-Pop',
    eventLocation: 'San Francisco',
    maxTickets: 4,
    categoria: 'Live Music'
  },
  {
    title: "Band vs Band",
    daysAhead: 30,
    hour: 16,
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Paid',
    genre: 'Rock',
    eventLocation: 'Los Angeles',
    maxTickets: null,
    categoria: 'Live Music'
  },
  {
    title: "Pop Classic",
    daysAhead: 38,
    hour: 16,
    location: "Staples Center, LA",
    image: "/public/images/musicImg.png",
    type: 'Paid',
    genre: 'Pop',
    eventLocation: 'Los Angeles',
    maxTickets: 6,
    categoria: 'Live Music'
  },
  {
    title: "90's Rock Punk",
    daysAhead: 45,
    hour: 16,
    location: "Staples Center, LA",
    image: "/public/images/card-2.jpg",
    type: 'Paid',
    genre: 'Rock',
    eventLocation: 'San Francisco',
    maxTickets: 8,
    categoria: 'Live Music'
  },
  {
    title: "Pop of 20's",
    daysAhead: 60,
    hour: 16,
    location: "Staples Center, LA",
    image: "/public/images/card-3.jpg",
    type: 'Paid',
    genre: 'Pop',
    eventLocation: 'San Francisco',
    maxTickets: null,
    categoria: 'Party / Nightlife'
  }
];

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // Precargar imágenes del seed a Cloudinary (CDN + optimización).
    // Si no está configurado, imageMap = null y se usan las rutas locales.
    const imageMap = await uploadSeedImagesToCloudinary(eventos.map(e => e.image));

    // Crear Admin
    await Admin.create({
      email: 'silverglidertickets@gmail.com',
      password: await bcrypt.hash('S!lv3rGl!d3r', 10)
    });
    console.log('Admin seeded!');

    // Crear User artist
    await User.create({
      email: 'artist.test@gmail.com',
      fullName: 'Artist Test',
      password: await bcrypt.hash('S!lv3rGl!d3r', 10),
      rol: 'artist'
    });
    console.log('Artist user seeded!');

    // Crear User partner
    await User.create({
      email: 'partner.test@gmail.com',
      fullName: 'Partner Test',
      password: await bcrypt.hash('S!lv3rGl!d3r', 10),
      rol: 'partner'
    });
    console.log('Partner user seeded!');

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
    for (const nombre of eventCategories) {
      const cat = await Categoria.create({ nombre, tipo: 'TYPE' });
      categoriasCreadas[nombre] = cat;
    }

    console.log('Categories seeded!');

    // Crear Eventos
    for (const eventoData of eventos) {
        const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';

        // Useful information: [horas string, accesibilidad, puntos de agua, food trucks, wifi, baños gratis]
        const usefulInfo = [
          '6 hours per day',
          true,  // accesibilidad
          true,  // puntos de agua
          false, // food trucks
          true,  // wifi
          true   // baños gratis
        ];

        // Simple mapeo de ubicación a una URL de Google Maps
        const mapsByLocation = {
          'Staples Center, LA': 'https://maps.google.com/?q=Staples+Center+Los+Angeles',
          'The Fillmore, SF': 'https://maps.google.com/?q=The+Fillmore+San+Francisco',
          'Golden Gate Park, SF': 'https://maps.google.com/?q=Golden+Gate+Park+San+Francisco'
        };

        // Resolver imagen: Cloudinary si se precargó, sino ruta local (fallback)
        const cloudImg = imageMap?.get(eventoData.image);
        const galeriaImagenes = [cloudImg ? cloudImg.url : eventoData.image];
        const galeriaPublicIds = cloudImg ? [cloudImg.publicId] : [];

        // Fechas relativas a hoy: el evento ocurre en `daysAhead` días; la venta abrió
        // hace 7 días y cierra 2h antes del evento → ventana activa al sembrar.
        const fecha = atDaysFromNow(eventoData.daysAhead, eventoData.hour ?? 20);
        const fechaInicioVenta = atDaysFromNow(-7, 0);
        const fechaFinVenta = new Date(fecha.getTime() - 2 * 60 * 60 * 1000);

        const newEvento = await Evento.create({
            titulo: eventoData.title,
            ubicacion: eventoData.location,
            maps: mapsByLocation[eventoData.location] || `https://maps.google.com/?q=${encodeURIComponent(eventoData.location)}`,
            fecha,
            galeriaImagenes,
            galeriaPublicIds,
            descripcion: lorem,
            useful_information: usefulInfo,
            organizadorId: Math.random() > 0.5 ? organizador1.id : organizador2.id,
            precio: eventoData.type === 'Free' ? 0 : Math.floor(Math.random() * 100) + 20,
            fechaInicioVenta,
            fechaFinVenta,
            maxTicketsPorUsuario: eventoData.maxTickets || null,
        });

        console.log(`\nAssociating categories for event: ${eventoData.title}`);

        // Lista de categorías a asociar
        const categoriasParaAsociar = [
            eventoData.type,
            eventoData.genre,
            eventoData.eventLocation,
            eventoData.categoria
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

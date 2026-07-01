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
    categoria: 'Live Music',
    descripcionDetallada: "Pop Gala 2026 is the brightest night of the year for chart-pop lovers in Los Angeles. Doors open early so you can explore the photo zones, grab merch, and find your spot before the first act takes the stage at the Staples Center. Expect a full production with massive LED walls, choreographed light shows, and a live band backing every headliner. The setlist spans today's biggest radio hits and a few surprise throwbacks the whole crowd can sing along to. Food trucks, accessible seating, free water stations, and clean restrooms keep the night comfortable from the opening number to the final encore. Arrive early, stay late, and dance until the lights come up.",
    lineup: [
      { nombre: "Lana Vox", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/lanavox" },
      { nombre: "The Skylines", imagen: "/public/images/card-2.jpg", link: "https://soundcloud.com/theskylines" },
      { nombre: "DJ Mireya", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/djmireya" }
    ]
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
    categoria: 'Festival',
    descripcionDetallada: "Indie Rock Fest brings the heart of San Francisco's independent music scene to the legendary Fillmore for one unforgettable evening. This is a celebration of guitar-driven anthems, raw vocals, and the kind of intimate energy that only a room with this much history can deliver. We've curated a lineup of rising local bands alongside touring favorites, so you'll discover your next obsession and revisit the songs you already love. Between sets, browse vinyl from local labels, sample craft food, and meet the artists at the merch tables. The venue is fully accessible, with free water stations, fast Wi-Fi, and clean restrooms throughout. Come for the music, stay for the community.",
    lineup: [
      { nombre: "Velvet Harbor", imagen: "/public/images/card-3.jpg", link: "https://instagram.com/velvetharbor" },
      { nombre: "Paper Tigers", imagen: "/public/images/card-3.jpg", link: "https://soundcloud.com/papertigers" }
    ]
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
    categoria: 'Party / Nightlife',
    descripcionDetallada: "EDM in the Park turns Golden Gate Park into an open-air dancefloor under the stars, and it's completely free to attend. As the sun sets, our stage comes alive with pulsing bass, immersive visuals, and a sound system tuned for the wide open space. This is electronic music the way it's meant to be experienced: thousands of people moving together, hands in the air, lost in the drop. The night flows from melodic house warm-ups into peak-time techno and festival anthems, with seamless transitions from a back-to-back DJ lineup. Free water stations, food trucks, accessible viewing areas, and restrooms are spread across the grounds so you can stay hydrated and keep dancing all night long.",
    lineup: [
      { nombre: "Aurora Beats", imagen: "/public/images/musicImg.png", link: "https://soundcloud.com/aurorabeats" },
      { nombre: "Nightfall", imagen: "/public/images/musicImg.png", link: "https://instagram.com/nightfall" },
      { nombre: "Pulse Theory", imagen: "/public/images/musicImg.png", link: "https://soundcloud.com/pulsetheory" }
    ]
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
    categoria: 'Live Music',
    descripcionDetallada: "Band vs Band 2026 is a free, all-day rock showdown where the city's loudest acts battle it out for the crowd's roar at the Staples Center. Each band gets a high-energy set, and you, the audience, help decide who walks away as champion. Expect blistering riffs, thunderous drums, and the kind of unfiltered live energy that only a friendly rivalry can spark. Between rounds, hit the food trucks, grab merch, and vote for your favorites. This is the perfect day out for die-hard rock fans and curious newcomers alike. The venue offers accessible seating, free water stations, fast Wi-Fi, and clean restrooms, so everyone can enjoy the battle from start to finish. Bring your friends and pick a side.",
    lineup: [
      { nombre: "Iron Verdict", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/ironverdict" },
      { nombre: "The Loud Ones", imagen: "/public/images/card-2.jpg", link: "https://soundcloud.com/theloudones" }
    ]
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
    categoria: 'Festival',
    descripcionDetallada: "Punk Rock Fest is a raw, fast, and fearless night at The Fillmore for everyone who lives for the spirit of DIY music. This is loud guitars, breakneck tempos, and crowd-surfing chaos in the best possible way. We've stacked the bill with hometown punk heroes and touring legends who keep the energy at maximum from the first power chord to the last. The pit is for everyone willing to look out for one another, and the balcony is there if you'd rather take it all in from above. Grab a shirt from the merch wall, sample food from local vendors, and refill at the free water stations. The venue is accessible, with clean restrooms and Wi-Fi. Tickets are limited, so don't sleep on this one.",
    lineup: [
      { nombre: "Concrete Riot", imagen: "/public/images/card-3.jpg", link: "https://instagram.com/concreteriot" },
      { nombre: "Static Youth", imagen: "/public/images/card-3.jpg", link: "https://soundcloud.com/staticyouth" },
      { nombre: "Dead Signal", imagen: "/public/images/card-3.jpg", link: "https://instagram.com/deadsignal" }
    ]
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
    categoria: 'Live Music',
    descripcionDetallada: "Experience the global phenomenon live as BTS brings their record-breaking show to Golden Gate Park for one spectacular night. This is more than a concert; it's a fully immersive production with cinematic visuals, jaw-dropping choreography, pyrotechnics, and a synchronized crowd that turns the whole park into a sea of light. From explosive title tracks to heartfelt ballads, the setlist is built to take you through every emotion alongside thousands of fellow fans. Official light sticks sync with the stage for an unforgettable shared moment. Arrive early for exclusive merch, photo zones, and pre-show fan activities. The grounds feature accessible viewing areas, free water stations, food vendors, fast Wi-Fi, and clean restrooms so your night is comfortable from soundcheck to the final encore.",
    lineup: [
      { nombre: "BTS", imagen: "/public/images/musicImg.png", link: "https://instagram.com/bts.bighitofficial" },
      { nombre: "Opening: NOVA", imagen: "/public/images/musicImg.png", link: "https://instagram.com/novaofficial" }
    ]
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
    categoria: 'Live Music',
    descripcionDetallada: "Band vs Band returns to the Staples Center for another head-to-head rock spectacle where only the crowd decides the winner. Each competing act delivers a tight, high-octane set designed to win you over, and the energy in the room only climbs as the night goes on. This is a celebration of live rock in all its forms, from gritty garage anthems to stadium-sized choruses you'll be humming for weeks. Come early to catch the underdogs, stay late for the headline clash, and make your voice heard when it's time to vote. Enjoy food trucks, merch booths, and meet-and-greet moments between rounds. The venue provides accessible seating, free water stations, fast Wi-Fi, and clean restrooms for a comfortable night out.",
    lineup: [
      { nombre: "Crimson Avenue", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/crimsonavenue" },
      { nombre: "Northbound", imagen: "/public/images/card-2.jpg", link: "https://soundcloud.com/northbound" }
    ]
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
    categoria: 'Live Music',
    descripcionDetallada: "Pop Classic is a love letter to the golden hits that defined a generation, performed live with a full band at the Staples Center. This is a feel-good night built on the songs you already know every word to, reimagined with rich arrangements and a stage show full of color and nostalgia. Sing along to timeless anthems, slow dance through the ballads, and let the choruses sweep the whole arena. Whether you grew up on these tracks or discovered them later, the joy is contagious and the energy is pure. Come early for photo ops and exclusive merch, and stay for an encore you won't forget. The venue offers accessible seating, free water stations, food vendors, fast Wi-Fi, and clean restrooms throughout the evening.",
    lineup: [
      { nombre: "The Goldtones", imagen: "/public/images/musicImg.png", link: "https://instagram.com/thegoldtones" },
      { nombre: "Mara Lane", imagen: "/public/images/musicImg.png", link: "https://soundcloud.com/maralane" }
    ]
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
    categoria: 'Live Music',
    descripcionDetallada: "90's Rock Punk is a high-voltage throwback to the decade that made distortion an art form, live at the Staples Center. Relive the era of ripped jeans, anthemic choruses, and rebellious energy with a lineup that channels the raw spirit of nineties rock and punk. Expect wall-to-wall guitars, sing-at-the-top-of-your-lungs hooks, and a crowd that remembers exactly where they were when these songs first hit. It's equal parts nostalgia trip and full-throttle party, perfect for longtime fans and a new generation discovering the sound. Grab vintage-inspired merch, hit the food trucks, and dive into the energy. The venue is fully accessible, with free water stations, fast Wi-Fi, and clean restrooms so you can rock out in comfort all night.",
    lineup: [
      { nombre: "Grunge Theory", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/grungetheory" },
      { nombre: "Sidewalk Saints", imagen: "/public/images/card-2.jpg", link: "https://soundcloud.com/sidewalksaints" },
      { nombre: "Faded Glory", imagen: "/public/images/card-2.jpg", link: "https://instagram.com/fadedglory" }
    ]
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
    categoria: 'Party / Nightlife',
    descripcionDetallada: "Pop of 20's is the ultimate celebration of this decade's defining sound, a glittering night of modern pop at the Staples Center. From viral hits to genre-bending bangers, this show captures everything that makes today's pop so irresistible: huge hooks, bold production, and an atmosphere built for dancing. The stage transforms into a neon playground with synchronized lights, dynamic visuals, and choreography that keeps the energy soaring. This is where the internet's favorite songs come to life in front of a roaring crowd. Come early for photo zones and limited-edition merch, then dance through the night with thousands of fellow fans. Accessible viewing, free water stations, food vendors, fast Wi-Fi, and clean restrooms keep the party going comfortably from start to finish.",
    lineup: [
      { nombre: "Neon Júne", imagen: "/public/images/card-3.jpg", link: "https://instagram.com/neonjune" },
      { nombre: "Echo Park Kids", imagen: "/public/images/card-3.jpg", link: "https://soundcloud.com/echoparkkids" }
    ]
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

        // Lineup del evento: si trae imagen relativa, usar la imagen ya resuelta (Cloudinary o local).
        const lineup = (eventoData.lineup || []).map(artista => ({
          ...artista,
          imagen: artista.imagen ? (galeriaImagenes[0] || artista.imagen) : null
        }));

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
            descripcionDetallada: eventoData.descripcionDetallada,
            lineup,
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

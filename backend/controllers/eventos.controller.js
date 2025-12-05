const { Evento, Categoria, Organizador } = require('../schemas');

// Get all eventos
const getAllEventos = async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      include: [
        {
          model: Categoria,
          as: 'Categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: {
            attributes: []
          }
        },
        {
          model: Organizador,
          as: 'Organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ]
    });
    res.json(eventos);
  } catch (error) {
    console.error('Error fetching eventos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get evento by id
const getEventoById = async (req, res) => {
  try {
    const { id } = req.params;
    const evento = await Evento.findByPk(id, {
      include: [
        {
          model: Categoria,
          as: 'Categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'Organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ]
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Asegurar que devolvemos los campos nuevos: descripcion, useful_information, maps, ubicacion, galeriaImagenes
    const {
      id: eventoId,
      titulo,
      descripcion,
      useful_information,
      maps,
      ubicacion,
      galeriaImagenes,
      fecha,
      precio
    } = evento;

    res.json({
      id: eventoId,
      titulo,
      descripcion,
      useful_information,
      maps,
      ubicacion,
      galeriaImagenes,
      fecha,
      precio,
      Organizador: evento.Organizador,
      Categorias: evento.Categorias
    });
  } catch (error) {
    console.error('Error fetching evento by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllEventos, getEventoById };

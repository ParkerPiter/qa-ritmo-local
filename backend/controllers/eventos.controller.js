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

module.exports = { getAllEventos };

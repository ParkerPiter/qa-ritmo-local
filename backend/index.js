const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const { sequelize, User, Anunciante, Anuncio, Categoria } = require('./schemas'); // Importa los modelos
const ProgressBar = require('progress');

const principalRoutes = require('./routes/principal.routes');

const port = 3001;
const app = express();
app.use(cors());
app.use(express.json());

const checkAndSyncTable = async (model, modelName) => {
  const tableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(modelName));
  if (tableExists) {
    const count = await model.count();
    if (count === 0) {
      await model.sync({ force: true });
      console.log(`Table ${modelName} recreated because it was empty.`);
    } else {
      await model.sync();
      console.log(`Table ${modelName} already exists and has data.`);
    }
  } else {
    await model.sync({ force: true });
    console.log(`Table ${modelName} created.`);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    await checkAndSyncTable(User, 'Users');
    await checkAndSyncTable(Anunciante, 'Anunciantes');
    await checkAndSyncTable(Categoria, 'Categorias');
    await checkAndSyncTable(Anuncio, 'Anuncios');
    
    console.log('Database synchronized');

    app.use('/api', principalRoutes);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Unable to start the server:', err);
  }
};

startServer();
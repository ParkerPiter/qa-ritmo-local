const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const { sequelize, User, Organizador, Evento, Categoria } = require('./schemas'); // Importa los modelos

const principalRoutes = require('./routes/principal.routes');

const port = 3001;
const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));

// const checkAndSyncTable = async (model, modelName) => {
//   const tableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(modelName));
//   if (tableExists) {
//     const count = await model.count();
//     if (count === 0) {
//       await model.sync({ force: false});
//       console.log(`Table ${modelName} recreated because it was empty.`);
//     } else {
//       await model.sync();
//       console.log(`Table ${modelName} already exists and has data.`);
//     }
//   } else {
//     await model.sync({ force: false});
//     console.log(`Table ${modelName} created.`);
//   }
// };

const startServer = async () => {
  try {
    console.log('Connecting to the database and synchronizing models...');

    await connectDB();

    await sequelize.sync({ force: false });
    
    console.log('\nDatabase synchronized successfully.');

    app.use('/api', principalRoutes);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Unable to start the server:', err);
  }
};

startServer();
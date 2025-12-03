const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3001;
// dotenv
require('dotenv').config();
const routerApi = require('./routes/router');
// Importar MongoDB
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { logError, errorHandler,  notFoundHandler, asyncErrorHandler } = require('./middlewares/errorHandler');

// Configurar CORS correctamente
const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')));

// Hello world
app.get("/", (req,res) => {
  res.send("Hello world on Express");
});

// Routers
routerApi(app);

app.get(/^\/(?!pinteres|review|servicio|user|zona).*/, (req, res, next) => {
  if (req.method !== 'GET' || !req.accepts('html')) {
    return next();
  }

  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use(notFoundHandler);
app.use(logError);       
app.use(errorHandler); 

// MongoDB
app.use(bodyParser.json());

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Conexion a MongoDB exitosa');

    app.listen(port, () => {
      console.log(`Servidor listo en puerto ${port}`);
    });
  } catch (err) {
    console.error('No se pudo conectar a MongoDB', err);
    process.exit(1);
  }
};

startServer();

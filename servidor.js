import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import preguntaRoutes from './src/routes/routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', preguntaRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>console.log('servidor funcionando'));

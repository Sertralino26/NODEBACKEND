import express from 'express';
import { 
    listarPreguntas, 
    crearPregunta,
    listarPreguntasConOpciones,
    editarPregunta
} from '../controllers/preguntascontroller.js';
import { obtenerCuestionario } from '../controllers/cuestionariocontroller.js';
import { 
  obtenerGrupos,
  obtenerGrupoPorId,
  crearGrupoConOpciones,
  editarGrupo,
  listarGrupos
} from '../controllers/grupocontroller.js';
import { 
  guardarRespuestas,
  obtenerRespuestasPorUsuario,
  listarUsuarios
 } from '../controllers/respuestascontroller.js';

const router = express.Router();

// --- PREGUNTAS ---
router.get('/preguntas', listarPreguntas);       
router.post('/crear-pregunta', crearPregunta);
router.get('/preguntas-con-opciones', listarPreguntasConOpciones);
router.put('/preguntas/:id', editarPregunta);

// --- GRUPOS ---
router.get('/grupos', obtenerGrupos);        
router.get('/grupos/:id', obtenerGrupoPorId);  
router.post('/grupos', crearGrupoConOpciones);  
router.put('/grupos/:id', editarGrupo); 
router.get('/listar-grupos', listarGrupos);

// --- CUESTIONARIO ---
router.get('/cuestionario', obtenerCuestionario); 

// --- RESPUESTAS ---
router.post('/respuestas', guardarRespuestas);

// --- USUARIO ---
router.get('/usuarios', listarUsuarios);
router.get('/respuestas/:email', obtenerRespuestasPorUsuario);

export default router;

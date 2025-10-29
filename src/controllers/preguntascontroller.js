import db from '../config/db.js';

/**
 * 1️⃣ Listar todas las preguntas
 */
export const listarPreguntas = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM preguntas;');
    res.json(result.rows); // ✅ En PostgreSQL el resultado está en result.rows
  } catch (error) {
    console.error('❌ Error al listar preguntas:', error);
    res.status(500).json({ mensaje: 'No se pudieron obtener las preguntas' });
  }
};

/**
 * 2️⃣ Crear una nueva pregunta
 */
export const crearPregunta = async (req, res) => {
  try {
    const { codigo, texto, id_grupo } = req.body;

    // En PostgreSQL se usan $1, $2, $3 en lugar de ?
    await db.query(
      `INSERT INTO preguntas (codigo, texto, id_grupo) VALUES ($1, $2, $3);`,
      [codigo, texto, id_grupo]
    );

    res.status(201).json({ mensaje: 'Pregunta creada correctamente' });
  } catch (error) {
    console.error('❌ Error al crear pregunta:', error);
    res.status(500).json({ mensaje: 'Error al crear la pregunta' });
  }
};

export const listarPreguntasConOpciones = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.texto, p.id_grupo, g.nombre AS nombre_grupo
      FROM preguntas p
      LEFT JOIN grupos_opciones g ON p.id_grupo = g.id
      ORDER BY p.id;
    `;

    const { rows } = await db.query(query);
    res.json(rows); // Devuelve [{id, texto, id_grupo, nombre_grupo}, ...]
  } catch (error) {
    console.error('Error al listar preguntas con grupo:', error);
    res.status(500).json({ mensaje: 'Error al listar preguntas' });
  }
};

export const editarPregunta = async (req, res) => {
  try {
    const { id } = req.params;
    const { texto, id_grupo } = req.body;

    // Actualizar solo texto y grupo de opciones
    const result = await db.query(
      'UPDATE preguntas SET texto=$1, id_grupo=$2 WHERE id=$3 RETURNING *',
      [texto, id_grupo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Pregunta no encontrada' });
    }

    res.json({
      mensaje: 'Pregunta actualizada correctamente',
      pregunta: result.rows[0]
    });
  } catch (error) {
    console.error('Error al editar pregunta:', error);
    res.status(500).json({ mensaje: 'Error al editar pregunta' });
  }
};

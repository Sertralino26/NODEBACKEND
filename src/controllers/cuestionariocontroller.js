import db from '../config/db.js';

export const obtenerCuestionario = async (req, res) => {
  try {
    // 1️⃣ Obtener todas las preguntas
    const resultPreguntas = await db.query('SELECT * FROM preguntas');
    const preguntas = resultPreguntas.rows;

    if (preguntas.length === 0) {
      return res.json({ preguntas: [], grupos: [] });
    }

    // 2️⃣ Obtener los IDs de grupos únicos
    const idsGrupos = [...new Set(preguntas.map(p => p.id_grupo))];

    // 3️⃣ Obtener los grupos y sus opciones
    const resultGrupos = await db.query(
      `
      SELECT 
        g.id AS id_grupo, 
        g.nombre AS grupo, 
        o.id AS id_opcion, 
        o.texto_opcion, 
        o.valor
      FROM grupos_opciones g
      JOIN opciones o ON g.id = o.id_grupo
      WHERE g.id = ANY($1)
      ORDER BY g.id, o.valor;
      `,
      [idsGrupos] // PostgreSQL usa $1, $2, etc.
    );

    const rows = resultGrupos.rows;

    // 4️⃣ Organizar los grupos
    const grupos = {};
    rows.forEach(r => {
      if (!grupos[r.id_grupo]) {
        grupos[r.id_grupo] = {
          id: r.id_grupo,
          nombre: r.grupo,
          opciones: []
        };
      }
      grupos[r.id_grupo].opciones.push({
        id: r.id_opcion,
        texto: r.texto_opcion,
        valor: r.valor
      });
    });

    // 5️⃣ Devolver todo
    res.json({
      preguntas,
      grupos: Object.values(grupos)
    });

  } catch (error) {
    console.error('❌ Error al obtener el cuestionario:', error);
    res.status(500).json({ mensaje: 'Error al obtener el cuestionario' });
  }
};

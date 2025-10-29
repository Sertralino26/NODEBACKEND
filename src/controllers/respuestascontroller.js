import db from '../config/db.js';

export const guardarRespuestas = async (req, res) => {
  try {
    const { email, codigo, respuestas } = req.body; // ⚡ ahora 'codigo' viene del frontend (A1, B2, etc.)

    // 🧩 Validaciones iniciales
    if (!email || !codigo || !Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos o inválidos.' });
    }

    // 🧠 1️⃣ Verificar si el usuario ya existe
    const { rows: usuarios } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    let usuario;

    if (usuarios.length === 0) {
      // 🆕 Crear nuevo usuario con su nivel como código
      const { rows } = await db.query(
        'INSERT INTO usuarios (email, codigo) VALUES ($1, $2) RETURNING *',
        [email, codigo]
      );

      usuario = rows[0];
    } else {
      usuario = usuarios[0];

      // 🔄 Si ya existe, actualizamos su código (nivel)
      await db.query('UPDATE usuarios SET codigo = $1 WHERE id = $2', [codigo, usuario.id]);
    }

    // 🧾 2️⃣ Limpiar respuestas anteriores y guardar nuevas
    await db.query('DELETE FROM respuestas WHERE id_usuario = $1', [usuario.id]);

    const insertQuery = `
      INSERT INTO respuestas (id_usuario, id_pregunta, id_opcion)
      VALUES ($1, $2, $3)
    `;

    for (const r of respuestas) {
      if (!r.id_pregunta || !r.id_opcion) continue;
      await db.query(insertQuery, [usuario.id, r.id_pregunta, r.id_opcion]);
    }

    // ✅ 3️⃣ Respuesta final
    res.status(201).json({
      mensaje: 'Usuario y respuestas guardadas correctamente',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        codigo: usuario.codigo, // este es el nivel (A1, B2, etc.)
      },
    });

  } catch (error) {
    console.error('Error al guardar respuestas:', error);
    res.status(500).json({ mensaje: 'Error al guardar respuestas.' });
  }
};

// GET /api/admin/usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT email FROM usuarios ORDER BY email ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
};
// GET /api/admin/respuestas/:email
export const obtenerRespuestasPorUsuario = async (req, res) => {
  try {
    const { email } = req.params;

    const { rows } = await db.query(`
      SELECT r.id AS id_respuesta, p.texto AS pregunta, o.texto_opcion AS opcion, r.fecha_respuesta
      FROM respuestas r
      JOIN usuarios u ON r.id_usuario = u.id
      JOIN preguntas p ON r.id_pregunta = p.id
      JOIN opciones o ON r.id_opcion = o.id
      WHERE u.email = $1
      ORDER BY r.fecha_respuesta DESC
    `, [email]);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener respuestas' });
  }
};

export const obtenerResultadoFinal = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ mensaje: 'Se requiere el email del usuario.' });
    }

    // 1️⃣ Obtener el usuario
    const { rows: usuarios } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const usuario = usuarios[0];

    // 2️⃣ Obtener las respuestas del usuario
    const { rows: respuestas } = await db.query(
      `SELECT r.id_pregunta, r.id_opcion, o.valor
       FROM respuestas r
       JOIN opciones o ON r.id_opcion = o.id
       WHERE r.id_usuario = $1`,
      [usuario.id]
    );

    // 3️⃣ Obtener todas las preguntas (para referencia y cálculo de resultados)
    const { rows: preguntas } = await db.query(
      'SELECT * FROM preguntas ORDER BY id'
    );

    res.status(200).json({
      usuario,
      respuestas,
      preguntas
    });

  } catch (error) {
    console.error('Error al obtener resultado final:', error);
    res.status(500).json({ mensaje: 'Error al obtener resultado final.' });
  }
};

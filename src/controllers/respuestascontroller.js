import db from '../config/db.js';
import crypto from 'crypto';

export const guardarRespuestas = async (req, res) => {
  try {
    const { email, respuestas } = req.body;

    // 🧩 Validaciones iniciales
    if (!email || !Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos o inválidos.' });
    }

    // 🧠 1️⃣ Verificar si el usuario ya existe
    const { rows: usuarios } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    let usuario;

    if (usuarios.length === 0) {
      // 🆕 Crear nuevo usuario con código aleatorio
      const codigo = crypto.randomBytes(3).toString('hex').toUpperCase(); // Ej: "A3F9C1"

      const { rows } = await db.query(
        'INSERT INTO usuarios (email, codigo) VALUES ($1, $2) RETURNING *',
        [email, codigo]
      );

      usuario = rows[0];
    } else {
      usuario = usuarios[0];
    }

    // 📝 2️⃣ Insertar respuestas
    const insertQuery = `
      INSERT INTO respuestas (id_usuario, id_pregunta, id_opcion)
      VALUES ($1, $2, $3)
    `;

    await db.query('DELETE FROM respuestas WHERE id_usuario = $1', [usuario.id]);

    // Puedes usar un `for...of` para mantener la ejecución secuencial
    for (const r of respuestas) {
      // Validar datos por si acaso
      if (!r.id_pregunta || !r.id_opcion) continue;

      await db.query(insertQuery, [usuario.id, r.id_pregunta, r.id_opcion]);
    }

    // ✅ 3️⃣ Respuesta final
    res.status(201).json({
      mensaje: 'Usuario y respuestas guardadas correctamente',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        codigo: usuario.codigo, // útil para mostrar en frontend
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

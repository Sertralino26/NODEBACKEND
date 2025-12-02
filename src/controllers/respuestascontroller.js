import db from '../config/db.js';
/**
 * Función Principal: Guarda/Actualiza el usuario y sus respuestas en una Transacción Atómica.
 * * USA db.begin() para garantizar que todo se haga o nada se haga (CLEAN SLATE).
 */
export const guardarRespuestas = async (req, res) => {
    const { email, codigo, respuestas } = req.body; 

    // 🧩 Validaciones iniciales
    if (!email || !codigo || !Array.isArray(respuestas) || respuestas.length === 0) {
        return res.status(400).json({ mensaje: 'Datos incompletos o inválidos.' });
    }

    try {
        // Usamos db.begin() para iniciar una transacción que envuelve todas las escrituras.
        const usuarioGuardado = await db.begin(async sql => {
            
            // 1️⃣ Verificar y obtener/crear usuario
            // Consulta: db`...` devuelve el array directamente
            const usuarios = await sql`SELECT * FROM usuarios WHERE email = ${email}`;
            
            let usuario;
            let usuarioId;

            if (usuarios.length === 0) {
                // 🆕 Crear nuevo usuario con su código (nivel)
                const newRows = await sql`
                    INSERT INTO usuarios (email, codigo) 
                    VALUES (${email}, ${codigo}) 
                    RETURNING id, email, codigo;
                `;
                usuario = newRows[0];
                usuarioId = usuario.id;
            } else {
                // 🔄 Si ya existe, actualizamos su código (nivel)
                await sql`UPDATE usuarios SET codigo = ${codigo} WHERE id = ${usuarios[0].id}`;
                usuario = usuarios[0];
                usuarioId = usuario.id;
            }

            // 2️⃣ Limpiar respuestas anteriores (CLEAN SLATE)
            await sql`DELETE FROM respuestas WHERE id_usuario = ${usuarioId}`;

            // 3️⃣ Guardar nuevas respuestas (Inserción en lote es mucho más eficiente que un bucle)
            const respuestasValidas = respuestas.filter(r => r.id_pregunta && r.id_opcion);

            if (respuestasValidas.length > 0) {
                // Preparamos los datos para la inserción en lote
                const data = respuestasValidas.map(r => ({
                    id_usuario: usuarioId,
                    id_pregunta: r.id_pregunta,
                    id_opcion: r.id_opcion,
                    // NOTA: fecha_respuesta debería tener un DEFAULT NOW() en tu tabla.
                }));

                // Inserción en lote con la sintaxis optimizada de 'postgres'
                await sql`
                    INSERT INTO respuestas 
                    ${sql(data, 'id_usuario', 'id_pregunta', 'id_opcion')}
                `;
            }

            // Devolver el objeto final del usuario actualizado/creado
            return usuario; 
        }); // COMMIT automático si todo es exitoso

        // ✅ 4️⃣ Respuesta final
        res.status(201).json({
            mensaje: 'Usuario y respuestas guardadas correctamente',
            usuario: {
                id: usuarioGuardado.id,
                email: usuarioGuardado.email,
                codigo: usuarioGuardado.codigo, 
            },
        });

    } catch (error) {
        // ROLLBACK automático si falla
        console.error('❌ Error al guardar respuestas (ROLLBACK):', error);
        res.status(500).json({ mensaje: 'Error al guardar respuestas.' });
    }
};


/**
 * GET /api/admin/usuarios
 * * Adaptado: Reemplaza .query() y .rows.
 */
export const listarUsuarios = async (req, res) => {
    try {
        // CORREGIDO: db`...` devuelve el array directo
        const usuarios = await db`SELECT DISTINCT email FROM usuarios ORDER BY email ASC`;
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
};

/**
 * GET /api/admin/respuestas/:email
 * * Adaptado: Reemplaza .query() y usa la interpolación segura.
 */
export const obtenerRespuestasPorUsuario = async (req, res) => {
    try {
        const { email } = req.params;

        // CORREGIDO: db`...` e interpolación segura (${email})
        const respuestas = await db`
            SELECT r.id AS id_respuesta, p.texto AS pregunta, o.texto_opcion AS opcion, r.fecha_respuesta
            FROM respuestas r
            JOIN usuarios u ON r.id_usuario = u.id
            JOIN preguntas p ON r.id_pregunta = p.id
            JOIN opciones o ON r.id_opcion = o.id
            WHERE u.email = ${email}
            ORDER BY r.fecha_respuesta DESC
        `;

        res.json(respuestas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener respuestas' });
    }
};

/**
 * GET /api/resultado/:email
 * * Adaptado: Reemplaza .query() y usa la interpolación segura.
 */
export const obtenerResultadoFinal = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ mensaje: 'Se requiere el email del usuario.' });
        }

        // 1️⃣ Obtener el usuario
        const usuarios = await db`SELECT * FROM usuarios WHERE email = ${email}`;

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const usuario = usuarios[0];

        // 2️⃣ Obtener las respuestas del usuario
        const respuestas = await db`
           SELECT r.id_pregunta, r.id_opcion, o.valor
           FROM respuestas r
           JOIN opciones o ON r.id_opcion = o.id
           WHERE r.id_usuario = ${usuario.id}
             AND r.id_pregunta BETWEEN 1 AND 25
           ORDER BY r.id_pregunta
        `;

        // 3️⃣ Obtener todas las preguntas
        const preguntas = await db`SELECT * FROM preguntas ORDER BY id`;

        res.status(200).json({
            usuario,
            respuestas,
            preguntas
        });

    } catch (error) {
        console.error('❌ Error al obtener resultado final:', error);
        res.status(500).json({ mensaje: 'Error al obtener resultado final.' });
    }
};
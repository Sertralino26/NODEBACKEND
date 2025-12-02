
import db from '../config/db.js';

/**
 * 1️⃣ Listar todas las preguntas
 * * Adaptado: Reemplaza .query() y .rows por la sintaxis de backticks de 'postgres'.
 */
export const listarPreguntas = async (req, res) => {
    try {
        // CORREGIDO: Usar db`...`
        const preguntas = await db`SELECT * FROM preguntas ORDER BY id`;
        
        // El resultado ya es el array de objetos.
        res.json(preguntas); 
    } catch (error) {
        console.error('❌ Error al listar preguntas:', error);
        res.status(500).json({ mensaje: 'No se pudieron obtener las preguntas' });
    }
};

/**
 * 2️⃣ Crear una nueva pregunta
 * * Adaptado: Reemplaza .query() y [$1, $2, $3] por la interpolación segura de 'postgres'.
 */
export const crearPregunta = async (req, res) => {
    try {
        const { codigo, texto, id_grupo } = req.body;

        // CORREGIDO: Usar db`...` e interpolación segura (${variable})
        await db`
            INSERT INTO preguntas (codigo, texto, id_grupo) 
            VALUES (${codigo}, ${texto}, ${id_grupo});
        `;

        res.status(201).json({ mensaje: 'Pregunta creada correctamente' });
    } catch (error) {
        console.error('❌ Error al crear pregunta:', error);
        res.status(500).json({ mensaje: 'Error al crear la pregunta' });
    }
};

/**
 * 3️⃣ Listar preguntas con el nombre del grupo de opciones asociado (JOIN)
 * * Adaptado: Reemplaza .query() y .rows.
 */
export const listarPreguntasConOpciones = async (req, res) => {
    try {
        // CORREGIDO: Usar db`...`
        const preguntas = await db`
            SELECT p.id, p.codigo, p.texto, p.id_grupo, g.nombre AS nombre_grupo
            FROM preguntas p
            LEFT JOIN grupos_opciones g ON p.id_grupo = g.id
            ORDER BY p.id;
        `;
        
        // El resultado ya es el array de objetos.
        res.json(preguntas); 
    } catch (error) {
        console.error('❌ Error al listar preguntas con grupo:', error);
        res.status(500).json({ mensaje: 'Error al listar preguntas' });
    }
};

/**
 * 4️⃣ Editar una pregunta
 * * Adaptado: Reemplaza .query() y usa la interpolación.
 */
export const editarPregunta = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto, id_grupo } = req.body;

        // CORREGIDO: Usar db`...` e interpolación segura
        const result = await db`
            UPDATE preguntas 
            SET texto = ${texto}, id_grupo = ${id_grupo} 
            WHERE id = ${id} 
            RETURNING *
        `;

        // 'postgres' no usa result.rowCount. Usamos result.length.
        if (result.length === 0) { 
            return res.status(404).json({ mensaje: 'Pregunta no encontrada' });
        }

        // 'postgres' devuelve el resultado en el array principal (result[0])
        res.json({
            mensaje: 'Pregunta actualizada correctamente',
            pregunta: result[0] 
        });
    } catch (error) {
        console.error('Error al editar pregunta:', error);
        res.status(500).json({ mensaje: 'Error al editar pregunta' });
    }
};
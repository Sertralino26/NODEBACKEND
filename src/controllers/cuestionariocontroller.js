import db from '../config/db.js';

export const obtenerCuestionario = async (req, res) => {
    try {
        // 1️⃣ Obtener todas las preguntas
        
        // SINTAXIS CORREGIDA: db`...` devuelve directamente el array
        const preguntas = await db`SELECT * FROM preguntas`; 

        // Ya no necesitamos 'resultPreguntas' ni .rows
        // La variable 'preguntas' ya es un array.

        if (preguntas.length === 0) {
            return res.json({ preguntas: [], grupos: [] });
        }

        // 2️⃣ Obtener los IDs de grupos únicos
        const idsGrupos = [...new Set(preguntas.map(p => p.id_grupo).filter(id => id !== null))];
        // Nota: Agregué .filter(id => id !== null) por si alguna pregunta no tiene grupo.

        // 3️⃣ Obtener los grupos y sus opciones
        
        // SINTAXIS CORREGIDA: Usamos db`...` y la interpolación segura ($)
        // La librería 'postgres' maneja automáticamente la conversión de arrays a 'IN' o 'ANY'.
        const opciones = await db`
            SELECT 
                g.id AS id_grupo, 
                g.nombre AS grupo, 
                o.id AS id_opcion, 
                o.texto_opcion, 
                o.valor
            FROM grupos_opciones g
            JOIN opciones o ON g.id = o.id_grupo
            -- Usamos la interpolación segura, no $1
            WHERE g.id = ANY(${idsGrupos}) 
            ORDER BY g.id, o.valor;
        `;
        
        // Ya no necesitamos 'resultGrupos' ni 'rows'
        const rows = opciones; 

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
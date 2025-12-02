import db from '../config/db.js';

/**
 * 1️⃣ Obtener todos los grupos con sus opciones
 */
export const listarGrupos = async (req, res) => {
  try {
    const result = await db`SELECT id, nombre FROM grupos_opciones ORDER BY id`;
    res.json(result.rows); // devuelve un array de objetos {id, nombre}
  } catch (error) {
    console.error('Error al listar grupos de opciones:', error);
    res.status(500).json({ mensaje: 'Error al listar grupos' });
  }
};

export const obtenerGrupos = async (req, res) => {
  try {
    const rows = await db`
            SELECT 
                g.id AS id_grupo,
                g.nombre AS grupo,
                o.id AS id_opcion,
                o.texto_opcion,
                o.valor
            FROM grupos_opciones g
            LEFT JOIN opciones o ON g.id = o.id_grupo
            ORDER BY g.id, o.valor;
        `;

    const grupos = {};
    rows.forEach(r => {
      if (!grupos[r.id_grupo]) {
        grupos[r.id_grupo] = {
          id: r.id_grupo,
          nombre: r.grupo,
          opciones: []
        };
      }
      if (r.id_opcion) {
        grupos[r.id_grupo].opciones.push({
          id: r.id_opcion,
          texto: r.texto_opcion,
          valor: r.valor
        });
      }
    });

    res.json(Object.values(grupos));
  } catch (error) {
    console.error('❌ Error al obtener grupos:', error);
    res.status(500).json({ mensaje: 'Error al obtener grupos' });
  }
};

/**
 * 2️⃣ Obtener un grupo por ID con sus opciones
 */
export const obtenerGrupoPorId = async (req, res) => {
  const { id } = req.params;
  try {
      const rows = await db`
            SELECT 
                g.id AS id_grupo,
                g.nombre AS grupo,
                o.id AS id_opcion,
                o.texto_opcion,
                o.valor
            FROM grupos_opciones g
            LEFT JOIN opciones o ON g.id = o.id_grupo
            WHERE g.id = ${id}
            ORDER BY o.valor;
        `;

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado' });
    }

    const grupo = {
      id: rows[0].id_grupo,
      nombre: rows[0].grupo,
      opciones: rows
        .filter(r => r.id_opcion)
        .map(r => ({
          id: r.id_opcion,
          texto: r.texto_opcion,
          valor: r.valor
        }))
    };

    res.json(grupo);
  } catch (error) {
    console.error('❌ Error al obtener grupo por ID:', error);
    res.status(500).json({ mensaje: 'Error al obtener grupo' });
  }
};

/**
 * 3️⃣ Crear grupo con sus opciones
 */
export const crearGrupoConOpciones = async (req, res) => {
    const { nombre, opciones } = req.body;

    try {
        // El método db.begin() toma una función asíncrona.
        // El objeto 'sql' dentro de la función es un cliente de transacción.
        const idGrupo = await db.begin(async sql => {
            
            // 1. Insertar grupo
            // Usamos el cliente 'sql' de la transacción y la sintaxis de backticks.
            const resultGrupo = await sql`
                INSERT INTO grupos_opciones (nombre) 
                VALUES (${nombre}) 
                RETURNING id;
            `;
            // El resultado es un array de objetos, tomamos el ID del primer elemento
            const newId = resultGrupo[0].id; 
            
            // 2. Insertar opciones (si hay)
            if (opciones && opciones.length > 0) {
                
                // Mapeamos el array de entrada a un array de objetos listos para la inserción en lote.
                const opcionesData = opciones.map(opt => ({
                    id_grupo: newId,
                    texto_opcion: opt.texto, // Asegúrate de que tu JSON de entrada usa 'texto'
                    valor: opt.valor          // Asegúrate de que tu JSON de entrada usa 'valor'
                }));
                
                // Uso de la sintaxis de Inserción de Lote (Batch Insert)
                // Esta es la forma más limpia y segura de insertar múltiples filas en 'postgres'.
                await sql`
                    INSERT INTO opciones 
                    ${sql(opcionesData, 'id_grupo', 'texto_opcion', 'valor')}
                `;
            }
            
            // Si la función sale con éxito, db.begin() ejecuta automáticamente COMMIT.
            return newId; // El valor retornado por la función interna es el resultado de db.begin()
        });
        // 

        res.json({ mensaje: 'Grupo creado con opciones', idGrupo });
    } catch (error) {
        // Si hay un error, db.begin() ejecuta automáticamente ROLLBACK.
        // 
        console.error('❌ Error al crear grupo:', error);
        // El error puede ser de conexión, de sintaxis o de transacción (p.ej., violar una restricción).
        res.status(500).json({ mensaje: 'Error al crear grupo con opciones' });
    }
    // NOTA: No se requiere 'finally' ni client.release() con db.begin()
};
/**
 * 4️⃣ Editar grupo (nombre u opciones)
 */
export const editarGrupo = async (req, res) => {
    const { id } = req.params;
    const { nombre, opciones } = req.body;

    try {
        // 1. Iniciar la transacción. El método db.begin() maneja COMMIT o ROLLBACK automáticamente.
        await db.begin(async sql => {
            
            // Usamos el cliente de transacción 'sql' para todas las operaciones:

            // A. Actualizar el nombre del grupo
            await sql`
                UPDATE grupos_opciones 
                SET nombre = ${nombre} 
                WHERE id = ${id}
            `;

            // B. Eliminar todas las opciones antiguas relacionadas con este grupo
            await sql`
                DELETE FROM opciones 
                WHERE id_grupo = ${id}
            `;

            // C. Insertar las opciones nuevas (si hay)
            if (opciones && opciones.length > 0) {
                
                // Preparamos los datos para la inserción en lote (Batch Insert)
                const opcionesData = opciones.map(opt => ({
                    id_grupo: id,
                    texto_opcion: opt.texto,
                    valor: opt.valor
                }));
                
                // Usamos la sintaxis de Inserción de Lote de 'postgres'.
                // ${sql(data, columns)} construye la consulta INSERT INTO table (cols) VALUES (data)
                await sql`
                    INSERT INTO opciones 
                    ${sql(opcionesData, 'id_grupo', 'texto_opcion', 'valor')}
                `;
            }
        }); 
        // Si el bloque try tuvo éxito, db.begin() hace el COMMIT.

        res.json({ mensaje: 'Grupo actualizado correctamente' });
    } catch (error) {
        // Si hay un error, db.begin() hace el ROLLBACK automáticamente.
        console.error('❌ Error al editar grupo:', error);
        res.status(500).json({ mensaje: 'Error al actualizar grupo' });
    }
    // NOTA: No se requiere el bloque 'finally' ni client.release() con db.begin().
};

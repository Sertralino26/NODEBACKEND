import db from '../config/db.js';

/**
 * 1️⃣ Obtener todos los grupos con sus opciones
 */
export const listarGrupos = async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre FROM grupos_opciones ORDER BY id');
    res.json(result.rows); // devuelve un array de objetos {id, nombre}
  } catch (error) {
    console.error('Error al listar grupos de opciones:', error);
    res.status(500).json({ mensaje: 'Error al listar grupos' });
  }
};

export const obtenerGrupos = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        g.id AS id_grupo,
        g.nombre AS grupo,
        o.id AS id_opcion,
        o.texto_opcion,
        o.valor
      FROM grupos_opciones g
      LEFT JOIN opciones o ON g.id = o.id_grupo
      ORDER BY g.id, o.valor;
    `);

    const rows = result.rows;

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
    const result = await db.query(`
      SELECT 
        g.id AS id_grupo,
        g.nombre AS grupo,
        o.id AS id_opcion,
        o.texto_opcion,
        o.valor
      FROM grupos_opciones g
      LEFT JOIN opciones o ON g.id = o.id_grupo
      WHERE g.id = $1
      ORDER BY o.valor;
    `, [id]);

    const rows = result.rows;

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

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Insertar grupo
    const resultGrupo = await client.query(
      'INSERT INTO grupos_opciones (nombre) VALUES ($1) RETURNING id;',
      [nombre]
    );
    const idGrupo = resultGrupo.rows[0].id;

    // Insertar opciones (si hay)
    if (opciones && opciones.length > 0) {
      const insertValues = opciones
        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
        .join(', ');
      const flatValues = [idGrupo, ...opciones.flatMap(opt => [opt.texto, opt.valor])];
      await client.query(
        `INSERT INTO opciones (id_grupo, texto_opcion, valor) VALUES ${insertValues}`,
        flatValues
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Grupo creado con opciones', idGrupo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear grupo:', error);
    res.status(500).json({ mensaje: 'Error al crear grupo con opciones' });
  } finally {
    client.release();
  }
};

/**
 * 4️⃣ Editar grupo (nombre u opciones)
 */
export const editarGrupo = async (req, res) => {
  const { id } = req.params;
  const { nombre, opciones } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query('UPDATE grupos_opciones SET nombre = $1 WHERE id = $2', [nombre, id]);

    await client.query('DELETE FROM opciones WHERE id_grupo = $1', [id]);

    if (opciones && opciones.length > 0) {
      const insertValues = opciones
        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
        .join(', ');
      const flatValues = [id, ...opciones.flatMap(opt => [opt.texto, opt.valor])];
      await client.query(
        `INSERT INTO opciones (id_grupo, texto_opcion, valor) VALUES ${insertValues}`,
        flatValues
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Grupo actualizado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al editar grupo:', error);
    res.status(500).json({ mensaje: 'Error al actualizar grupo' });
  } finally {
    client.release();
  }
};

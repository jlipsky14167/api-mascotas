import { Hono } from 'hono';
import { Pool } from 'pg';
import { Context } from 'hono';

const app = new Hono();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// PostgreSQL connection pool
let pool: Pool;
try {
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl:
      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  // Probar conexión al iniciar
  pool
    .query('SELECT 1')
    .then(() => {
      console.log('Conexión a PostgreSQL exitosa');
    })
    .catch((err) => {
      console.error('Error de conexión a PostgreSQL:', err.message);
      process.exit(1);
    });
} catch (err: any) {
  console.error('Error al configurar el pool de PostgreSQL:', err.message);
  process.exit(1);
}

// Middleware CORS (permitir cualquier origen)
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (c.req.method === 'OPTIONS') {
    c.status(204);
    return c.text('');
  }
  return await next();
});

// US-1: Registrar mis diferentes mascotas
app.post('/pets', async (c: Context) => {
  try {
    const { name, main_owner_id, vet_id, breed_id, birthdate } =
      await c.req.json();
    if (!birthdate) {
      return c.json({ error: 'El campo birthdate es obligatorio' }, 400);
    }
    const result = await pool.query(
      'INSERT INTO pets (name, main_owner_id, vet_id, created_at, breed_id, birthdate) VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *',
      [name, main_owner_id, vet_id, breed_id, birthdate]
    );
    return c.json(result.rows[0]);
  } catch (err: any) {
    console.error('DB error /pets:', err.message);
    return c.json(
      { error: 'Error al registrar mascota', details: err.message },
      500
    );
  }
});

// US-2, US-4, US-6, US-8, US-9: Registrar eventos (vacuna, desparasitacion, cita medica, resultado laboratorio, compra alimento)
app.post('/events', async (c: Context) => {
  try {
    const { event_type_id, body, pet_id, status, alarm_at } =
      await c.req.json();
    const result = await pool.query(
      'INSERT INTO events (event_type_id, body, pet_id, status, created_at, alarm_at, alarm_made) VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *',
      [event_type_id, body, pet_id, status, alarm_at, false]
    );
    return c.json(result.rows[0]);
  } catch (err: any) {
    console.error('DB error /events:', err.message);
    return c.json(
      { error: 'Error al registrar evento', details: err.message },
      500
    );
  }
});

// US-3, US-5: Recordatorio de próxima vacuna/desparasitacion (próximo evento de tipo)
app.get('/pets/:pet_id/next-event/:event_type_id', async (c: Context) => {
  try {
    const { pet_id, event_type_id } = c.req.param();
    const result = await pool.query(
      'SELECT * FROM events WHERE pet_id = $1 AND event_type_id = $2 AND alarm_at > NOW() ORDER BY alarm_at ASC LIMIT 1',
      [pet_id, event_type_id]
    );
    return c.json(result.rows[0] || {});
  } catch (err: any) {
    console.error(
      'DB error /pets/:pet_id/next-event/:event_type_id:',
      err.message
    );
    return c.json(
      { error: 'Error al consultar próximo evento', details: err.message },
      500
    );
  }
});

// US-10: Calculo próxima compra de alimento (crea evento de tipo compra de alimento)
app.post('/pets/:pet_id/next-food-purchase', async (c: Context) => {
  try {
    const { pet_id } = c.req.param();
    const { body, status, alarm_at } = await c.req.json();
    const event_type_id = 5;
    const result = await pool.query(
      'INSERT INTO events (event_type_id, body, pet_id, status, created_at, alarm_at, alarm_made) VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *',
      [event_type_id, body, pet_id, status, alarm_at, false]
    );
    return c.json(result.rows[0]);
  } catch (err: any) {
    console.error('DB error /pets/:pet_id/next-food-purchase:', err.message);
    return c.json(
      {
        error: 'Error al registrar próxima compra de alimento',
        details: err.message
      },
      500
    );
  }
});

// US-11: Ajuste a fecha compra alimento (editar evento de tipo compra de alimento)
app.put('/events/:event_id', async (c: Context) => {
  try {
    const { event_id } = c.req.param();
    const { alarm_at } = await c.req.json();
    const result = await pool.query(
      'UPDATE events SET alarm_at = $1 WHERE event_id = $2 RETURNING *',
      [alarm_at, event_id]
    );
    return c.json(result.rows[0]);
  } catch (err: any) {
    console.error('DB error /events/:event_id:', err.message);
    return c.json(
      { error: 'Error al actualizar evento', details: err.message },
      500
    );
  }
});

// US-12: Acceso desde dispositivo con mi correo electrónico (login básico)
app.post('/login', async (c: Context) => {
  try {
    const { email } = await c.req.json();
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [
      email
    ]);
    if (result.rows.length > 0) {
      return c.json({ success: true, user: result.rows[0] });
    } else {
      return c.json({ success: false, message: 'Usuario no encontrado' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /login:', err.message);
    return c.json(
      { error: 'Error al consultar usuario', details: err.message },
      500
    );
  }
});

// US-13: Validar registros históricos (listar eventos históricos de una mascota)
app.get('/pets/:pet_id/events', async (c: Context) => {
  try {
    const { pet_id } = c.req.param();
    const result = await pool.query(
      'SELECT * FROM events WHERE pet_id = $1 ORDER BY created_at DESC',
      [pet_id]
    );
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /pets/:pet_id/events:', err.message);
    return c.json(
      { error: 'Error al consultar eventos históricos', details: err.message },
      500
    );
  }
});

// US-16: Información de Razas de Perros
app.get('/breeds', async (_c: Context) => {
  try {
    const result = await pool.query('SELECT * FROM breeds');
    return _c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /breeds:', err.message);
    return _c.json(
      { error: 'Error al consultar razas', details: err.message },
      500
    );
  }
});

// Endpoints CRUD para usuarios
// Crear usuario
app.post('/users', async (c: Context) => {
  try {
    const { username, user_type_id } = await c.req.json();
    const result = await pool.query(
      'INSERT INTO users (username, user_type_id, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [username, user_type_id]
    );
    return c.json(result.rows[0]);
  } catch (err: any) {
    console.error('DB error /users (POST):', err.message);
    return c.json(
      { error: 'Error al crear usuario', details: err.message },
      500
    );
  }
});

// Listar usuarios
app.get('/users', async (c: Context) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY user_id ASC');
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /users (GET):', err.message);
    return c.json(
      { error: 'Error al listar usuarios', details: err.message },
      500
    );
  }
});

// Detalle de usuario
app.get('/users/:user_id', async (c: Context) => {
  try {
    const { user_id } = c.req.param();
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [
      user_id
    ]);
    if (result.rows.length > 0) {
      return c.json(result.rows[0]);
    } else {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /users/:user_id (GET):', err.message);
    return c.json(
      { error: 'Error al obtener usuario', details: err.message },
      500
    );
  }
});

// Editar usuario
app.put('/users/:user_id', async (c: Context) => {
  try {
    const { user_id } = c.req.param();
    const { username, user_type_id } = await c.req.json();
    const result = await pool.query(
      'UPDATE users SET username = $1, user_type_id = $2 WHERE user_id = $3 RETURNING *',
      [username, user_type_id, user_id]
    );
    if (result.rows.length > 0) {
      return c.json(result.rows[0]);
    } else {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /users/:user_id (PUT):', err.message);
    return c.json(
      { error: 'Error al editar usuario', details: err.message },
      500
    );
  }
});

// Borrar usuario
app.delete('/users/:user_id', async (c: Context) => {
  try {
    const { user_id } = c.req.param();
    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING *',
      [user_id]
    );
    if (result.rows.length > 0) {
      return c.json({ success: true, deleted: result.rows[0] });
    } else {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /users/:user_id (DELETE):', err.message);
    return c.json(
      { error: 'Error al borrar usuario', details: err.message },
      500
    );
  }
});

// Listar tipos de usuario
app.get('/user-types', async (c: Context) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_types ORDER BY user_type_id ASC'
    );
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /user-types (GET):', err.message);
    return c.json(
      { error: 'Error al listar tipos de usuario', details: err.message },
      500
    );
  }
});

// Endpoint: Próximos eventos de una mascota
app.get('/pets/:pet_id/upcoming-events', async (c: Context) => {
  try {
    const { pet_id } = c.req.param();
    const result = await pool.query(
      'SELECT * FROM events WHERE pet_id = $1 AND alarm_at > NOW() ORDER BY alarm_at ASC',
      [pet_id]
    );
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /pets/:pet_id/upcoming-events:', err.message);
    return c.json(
      { error: 'Error al consultar próximos eventos', details: err.message },
      500
    );
  }
});

// Endpoint: Próximos eventos globales (opcional: filtrar por mascota)
// Solo eventos dentro de los próximos 30 días, con join a tipo de evento y mascota
app.get('/upcoming-events', async (c: Context) => {
  try {
    const { pet_id, limit } = c.req.query();
    let query = `
      SELECT 
        e.*, 
        et.title AS event_type_name, 
        p.name AS pet_name 
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.event_type_id
      LEFT JOIN pets p ON e.pet_id = p.pet_id
      WHERE e.alarm_at > NOW() AND e.alarm_at <= NOW() + INTERVAL '30 days'
    `;
    const params: any[] = [];
    if (pet_id) {
      query += ' AND e.pet_id = $1';
      params.push(pet_id);
    }
    query += ' ORDER BY e.alarm_at ASC';
    if (limit) {
      query += pet_id ? ' LIMIT $2' : ' LIMIT $1';
      params.push(Number(limit));
    }
    const result = await pool.query(query, params);
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /upcoming-events:', err.message);
    return c.json(
      { error: 'Error al consultar próximos eventos', details: err.message },
      500
    );
  }
});

// Endpoint: Resumen de mascotas
app.get('/pets/summary', async (c: Context) => {
  try {
    // Total de mascotas
    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM pets'
    );
    const total = totalResult.rows[0]?.total || 0;

    // Media de edad en años (usando birthdate)
    const avgResult = await pool.query(
      'SELECT AVG(EXTRACT(YEAR FROM AGE(NOW(), birthdate))) AS avg_years FROM pets'
    );
    const mediaEdad = avgResult.rows[0]?.avg_years
      ? Number(avgResult.rows[0].avg_years)
      : 0;

    // Cachorros: menores de 2 años
    const cachorrosResult = await pool.query(
      "SELECT pet_id, name, birthdate, breed_id, main_owner_id, vet_id FROM pets WHERE AGE(NOW(), birthdate) < INTERVAL '2 years'"
    );
    const listaCachorros = cachorrosResult.rows;

    // Porcentaje de cachorros
    const porcentajeCachorros =
      total > 0 ? (listaCachorros.length / total) * 100 : 0;

    return c.json({
      total,
      mediaEdad,
      porcentajeCachorros,
      listaCachorros
    });
  } catch (err: any) {
    console.error('DB error /pets/summary:', err.message);
    return c.json(
      { error: 'Error al consultar resumen de mascotas', details: err.message },
      500
    );
  }
});

app.get('/', (c: Context) => c.text('This is the API for the Pets SPA!'));

// Middleware para verificar conexión a la base de datos
app.use('*', async (c, next) => {
  if (!pool) {
    return c.json({ error: 'No hay conexión a la base de datos' }, 500);
  }
  return await next();
});

// Listar mascotas con nombres de dueño, veterinario y raza
app.get('/pets', async (c: Context) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.pet_id, 
        p.name, 
        p.birthdate, 
        p.created_at,
        p.main_owner_id,
        owner.username AS main_owner_name,
        p.vet_id,
        vet.username AS vet_name,
        p.breed_id,
        b.name_es AS breed_name
      FROM pets p
      LEFT JOIN users owner ON p.main_owner_id = owner.user_id
      LEFT JOIN users vet ON p.vet_id = vet.user_id
      LEFT JOIN breeds b ON p.breed_id = b.breed_id
      ORDER BY p.pet_id ASC
    `);
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /pets (GET):', err.message);
    return c.json(
      { error: 'Error al listar mascotas', details: err.message },
      500
    );
  }
});

// Endpoint: Buscar mascotas por nombre (para select asincrónico)
app.get('/pets/searchByName', async (c: Context) => {
  try {
    const { search } = c.req.query();
    let query = '';
    let params: any[] = [];
    if (search) {
      query =
        'SELECT * FROM pets WHERE LOWER(name) LIKE $1 ORDER BY pet_id ASC';
      params = [`%${search.toLowerCase()}%`];
    } else {
      return c.json(
        {
          error: 'Error al listar mascotas',
          details: 'El parámetro "search" es obligatorio'
        },
        500
      );
    }
    const result = await pool.query(query, params);
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /pets (GET):', err.message);
    return c.json(
      { error: 'Error al listar mascotas', details: err.message },
      500
    );
  }
});

// Editar mascota
app.put('/pets/:pet_id', async (c: Context) => {
  try {
    const { pet_id } = c.req.param();
    const { name, main_owner_id, vet_id, breed_id, birthdate } =
      await c.req.json();
    if (!name || !main_owner_id || !vet_id || !breed_id || !birthdate) {
      return c.json({ error: 'Todos los campos son obligatorios' }, 400);
    }
    const result = await pool.query(
      'UPDATE pets SET name = $1, main_owner_id = $2, vet_id = $3, breed_id = $4, birthdate = $5 WHERE pet_id = $6 RETURNING *',
      [name, main_owner_id, vet_id, breed_id, birthdate, pet_id]
    );
    if (result.rows.length > 0) {
      return c.json(result.rows[0]);
    } else {
      return c.json({ error: 'Mascota no encontrada' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /pets/:pet_id (PUT):', err.message);
    return c.json(
      { error: 'Error al editar mascota', details: err.message },
      500
    );
  }
});

// Endpoint: Detalle de mascota
app.get('/pets/:pet_id', async (c: Context) => {
  try {
    const { pet_id } = c.req.param();
    const result = await pool.query('SELECT * FROM pets WHERE pet_id = $1', [
      pet_id
    ]);
    if (result.rows.length > 0) {
      return c.json(result.rows[0]);
    } else {
      return c.json({ error: 'Mascota no encontrada' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /pets/:pet_id (GET):', err.message);
    return c.json(
      { error: 'Error al obtener mascota', details: err.message },
      500
    );
  }
});

// Listar eventos con paginación
app.get('/events', async (c: Context) => {
  try {
    const { limit, offset } = c.req.query();
    const lim = Math.max(1, Math.min(Number(limit) || 10, 100));
    const off = Math.max(0, Number(offset) || 0);
    const result = await pool.query(
      `SELECT
        e.*, 
        et.title AS event_type_name, 
        p.name AS pet_name 
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.event_type_id
      LEFT JOIN pets p ON e.pet_id = p.pet_id
      ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [lim, off]
    );
    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM events'
    );
    return c.json({
      rows: result.rows,
      total: totalResult.rows[0]?.total || 0
    });
  } catch (err: any) {
    console.error('DB error /events (GET):', err.message);
    return c.json(
      { error: 'Error al listar eventos', details: err.message },
      500
    );
  }
});

// Endpoint: Detalle de evento
app.get('/events/:event_id', async (c: Context) => {
  try {
    const { event_id } = c.req.param();
    const result = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [event_id]
    );
    if (result.rows.length > 0) {
      return c.json(result.rows[0]);
    } else {
      return c.json({ error: 'Evento no encontrado' }, 404);
    }
  } catch (err: any) {
    console.error('DB error /events/:event_id (GET):', err.message);
    return c.json(
      { error: 'Error al obtener evento', details: err.message },
      500
    );
  }
});

// Endpoint: Listar tipos de evento
app.get('/event_types', async (c: Context) => {
  try {
    const result = await pool.query(
      'SELECT * FROM event_types ORDER BY event_type_id ASC'
    );
    return c.json(result.rows);
  } catch (err: any) {
    console.error('DB error /event_types (GET):', err.message);
    return c.json(
      { error: 'Error al listar tipos de evento', details: err.message },
      500
    );
  }
});

app.fire();

export default {
  port,
  fetch: app.fetch
};

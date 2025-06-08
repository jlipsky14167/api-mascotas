import { Hono } from 'hono';
import { Pool } from 'pg';
import { Context } from 'hono';

const app = new Hono();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

console.log(
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_NAME,
  process.env.DB_PORT
);

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

// US-1: Registrar mis diferentes mascotas
app.post('/pets', async (c: Context) => {
  try {
    const { name, main_owner_id, vet_id, breed_id } = await c.req.json();
    const result = await pool.query(
      'INSERT INTO pets (name, main_owner_id, vet_id, created_at, breed_id) VALUES ($1, $2, $3, NOW(), $4) RETURNING *',
      [name, main_owner_id, vet_id, breed_id]
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

app.get('/', (c: Context) => c.text('This is the API for the Pets SPA!'));

// Middleware para verificar conexión a la base de datos
app.use('*', async (c, next) => {
  if (!pool) {
    return c.json({ error: 'No hay conexión a la base de datos' }, 500);
  }
  return await next();
});

app.fire();

export default {
  port,
  fetch: app.fetch
};

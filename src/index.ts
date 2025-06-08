import { Hono } from 'hono';
import { Pool } from 'pg';
import { Context } from 'hono';

const app = new Hono();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  max: 10,
  idleTimeoutMillis: 30000
});

// US-1: Registrar mis diferentes mascotas
app.post('/pets', async (c: Context) => {
  const { main_owner_id, vet_id, breed_id } = await c.req.json();
  const result = await pool.query(
    'INSERT INTO pets (main_owner_id, vet_id, created_at, breed_id) VALUES ($1, $2, NOW(), $3) RETURNING *',
    [main_owner_id, vet_id, breed_id]
  );
  return c.json(result.rows[0]);
});

// US-2, US-4, US-6, US-8, US-9: Registrar eventos (vacuna, desparasitacion, cita medica, resultado laboratorio, compra alimento)
app.post('/events', async (c: Context) => {
  const { event_type_id, body, pet_id, status, alarm_at } = await c.req.json();
  // alarm_made siempre debe ser false al crear
  const result = await pool.query(
    'INSERT INTO events (event_type_id, body, pet_id, status, created_at, alarm_at, alarm_made) VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *',
    [event_type_id, body, pet_id, status, alarm_at, false]
  );
  return c.json(result.rows[0]);
});

// US-3, US-5: Recordatorio de próxima vacuna/desparasitacion (próximo evento de tipo)
app.get('/pets/:pet_id/next-event/:event_type_id', async (c: Context) => {
  const { pet_id, event_type_id } = c.req.param();
  const result = await pool.query(
    'SELECT * FROM events WHERE pet_id = $1 AND event_type_id = $2 AND alarm_at > NOW() ORDER BY alarm_at ASC LIMIT 1',
    [pet_id, event_type_id]
  );
  return c.json(result.rows[0] || {});
});

// US-10: Calculo próxima compra de alimento (crea evento de tipo compra de alimento)
app.post('/pets/:pet_id/next-food-purchase', async (c: Context) => {
  const { pet_id } = c.req.param();
  const { body, status, alarm_at } = await c.req.json();
  const event_type_id = 5;
  const result = await pool.query(
    'INSERT INTO events (event_type_id, body, pet_id, status, created_at, alarm_at, alarm_made) VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *',
    [event_type_id, body, pet_id, status, alarm_at, false]
  );
  return c.json(result.rows[0]);
});

// US-11: Ajuste a fecha compra alimento (editar evento de tipo compra de alimento)
app.put('/events/:event_id', async (c: Context) => {
  const { event_id } = c.req.param();
  const { alarm_at } = await c.req.json();
  // Solo se permite editar alarm_at
  const result = await pool.query(
    'UPDATE events SET alarm_at = $1 WHERE event_id = $2 RETURNING *',
    [alarm_at, event_id]
  );
  return c.json(result.rows[0]);
});

// US-12: Acceso desde dispositivo con mi correo electrónico (login básico)
app.post('/login', async (c: Context) => {
  const { email } = await c.req.json();
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [
    email
  ]);
  if (result.rows.length > 0) {
    return c.json({ success: true, user: result.rows[0] });
  } else {
    return c.json({ success: false, message: 'Usuario no encontrado' }, 404);
  }
});

// US-7, US-8: Archivar recetas médicas y resultados de laboratorio (eventos)
// Ya cubierto por /events POST

// US-13: Validar registros históricos (listar eventos históricos de una mascota)
app.get('/pets/:pet_id/events', async (c: Context) => {
  const { pet_id } = c.req.param();
  const result = await pool.query(
    'SELECT * FROM events WHERE pet_id = $1 ORDER BY created_at DESC',
    [pet_id]
  );
  return c.json(result.rows);
});

// US-16: Información de Razas de Perros
app.get('/breeds', async (_c: Context) => {
  const result = await pool.query('SELECT * FROM breeds');
  return _c.json(result.rows);
});

app.get('/', (c: Context) => c.text('This is the API for the Pets SPA!'));

app.fire();

export default {
  port: 3000,
  fetch: app.fetch
};

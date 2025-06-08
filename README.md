# Bun + Hono REST API con PostgreSQL

Este proyecto contiene:

- Una API REST desarrollada con Bun y Hono (en `src/index.ts`)
- Una base de datos PostgreSQL
- Docker Compose para levantar la base de datos

## Uso

1. Instala las dependencias:
   ```bash
   bun install
   ```
2. Levanta la base de datos PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Inicia la API en modo desarrollo:
   ```bash
   bun run dev
   ```
   O en modo producción (compilado):
   ```bash
   bun start
   ```
4. La API estará disponible en http://localhost:3000

## Desarrollo

- El código fuente de la API está en `src/index.ts`.
- Las variables de entorno para la conexión a la base de datos están en `docker-compose.yml`.
- El esquema de la base de datos se inicializa automáticamente desde `init.sql` al levantar el contenedor de PostgreSQL.

## Parar los servicios

```bash
docker compose down
```

# API de Gestión de Mascotas y Eventos

Esta API permite registrar mascotas, eventos veterinarios, compras de alimento, razas y usuarios, así como consultar y actualizar información relevante para la gestión de mascotas.

## Endpoints principales

### Mascotas

- **Registrar mascota**
  - `POST /pets`
  - Body: `{ name, main_owner_id, vet_id, breed_id, birthdate }`
  - Respuesta: mascota creada

### Eventos (vacunas, desparasitaciones, citas, compras, etc)

- **Registrar evento**

  - `POST /events`
  - Body: `{ event_type_id, body, pet_id, status, alarm_at }`
  - Respuesta: evento creado
  - Nota: El campo `alarm_made` es privado y no debe ser enviado ni mostrado al usuario.

- **Próximo evento de tipo (vacuna/desparasitacion) para mascota**

  - `GET /pets/:pet_id/next-event/:event_type_id`
  - Respuesta: evento más próximo (o vacío)

- **Registrar próxima compra de alimento**

  - `POST /pets/:pet_id/next-food-purchase`
  - Body: `{ body, status, alarm_at }`
  - Respuesta: evento creado (event_type_id=5)
  - Nota: El campo `alarm_made` es privado y no debe ser enviado ni mostrado al usuario.

- **Ajustar fecha de compra de alimento**

  - `PUT /events/:event_id`
  - Body: `{ alarm_at }`
  - Respuesta: evento actualizado

- **Histórico de eventos de una mascota**

  - `GET /pets/:pet_id/events`
  - Respuesta: lista de eventos

- **Próximos eventos de una mascota**
  - `GET /pets/:pet_id/upcoming-events`
  - Respuesta: lista de eventos futuros ordenados por fecha

### Usuarios

- **Login por correo electrónico**
  - `POST /login`
  - Body: `{ email }`
  - Respuesta: usuario encontrado o error

### Razas

- **Listar razas**
  - `GET /breeds`
  - Respuesta: lista de razas

## Notas

- Los tipos de evento (`event_type_id`) deben estar definidos en la tabla `event_types`.
- Los endpoints de eventos permiten registrar vacunas, desparasitaciones, citas médicas, resultados de laboratorio, recetas médicas y compras de alimento, diferenciados por el `event_type_id`.
- El campo `alarm_at` permite programar recordatorios para eventos futuros.
- El campo `alarm_made` es privado y solo lo gestiona el sistema para el control interno de recordatorios.

## Ejemplo de uso

Registrar una mascota:

```json
POST /pets
{
  "name": "Max",
  "main_owner_id": 1,
  "vet_id": 2,
  "breed_id": 3,
  "birthdate": "2020-05-01"
}
```

Registrar una vacuna:

```json
POST /events
{
  "event_type_id": 1, // ID para vacuna
  "body": "Vacuna antirrábica",
  "pet_id": 1,
  "status": "completado",
  "alarm_at": "2025-07-01T10:00:00Z"
}
```

## Estructura de la base de datos

Ver archivo `init.sql` para la definición de tablas y relaciones.

---

¿Necesitas ejemplos de respuesta, detalles de cada campo o autenticación avanzada? ¡Avísame!

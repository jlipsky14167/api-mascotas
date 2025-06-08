CREATE TABLE IF NOT EXISTS user_types (
  user_type_id SERIAL PRIMARY KEY,
  title VARCHAR(255)
);

-- Insertar tipos de usuario solo si no existen
INSERT INTO user_types (user_type_id, title) VALUES
  (1, 'veterinario'),
  (2, 'cuidador')
ON CONFLICT (user_type_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255),
  user_type_id INTEGER REFERENCES user_types(user_type_id),
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breeds (
  breed_id SERIAL PRIMARY KEY,
  name_es VARCHAR(255),
  name_en VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS event_types (
  event_type_id SERIAL PRIMARY KEY,
  title VARCHAR(255)
);

-- Insertar tipos de evento relevantes para las historias de usuario solo si no existen
INSERT INTO event_types (event_type_id, title) VALUES
  (1, 'vacuna'),
  (2, 'desparasitacion'),
  (3, 'cita medica'),
  (4, 'resultado de laboratorio'),
  (5, 'compra de alimento'),
  (6, 'receta medica')
ON CONFLICT (event_type_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pets (
  pet_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  main_owner_id INTEGER REFERENCES users(user_id),
  vet_id INTEGER REFERENCES users(user_id),
  created_at TIMESTAMP,
  breed_id INTEGER REFERENCES breeds(breed_id)
);

CREATE TABLE IF NOT EXISTS events (
  event_id SERIAL PRIMARY KEY,
  event_type_id INTEGER REFERENCES event_types(event_type_id),
  body TEXT,
  pet_id INTEGER NOT NULL REFERENCES pets(pet_id),
  status VARCHAR(255),
  created_at TIMESTAMP,
  alarm_at TIMESTAMP,
  alarm_made BOOLEAN
);

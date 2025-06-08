# Ejemplos de requests curl para pruebas en Postman

## Usuarios

### Crear usuario

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario1","user_type_id":1}'
```

### Listar usuarios

```bash
curl http://localhost:3000/users
```

### Detalle de usuario

```bash
curl http://localhost:3000/users/1
```

### Editar usuario

```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario1_editado","user_type_id":2}'
```

### Borrar usuario

```bash
curl -X DELETE http://localhost:3000/users/1
```

### Listar tipos de usuario

```bash
curl http://localhost:3000/user-types
```

## Registrar mascota

```bash
curl -X POST http://localhost:3000/pets \
  -H "Content-Type: application/json" \
  -d '{"name":"Max","main_owner_id":1,"vet_id":2,"breed_id":3,"birthdate":"2020-05-01"}'
```

## Registrar vacuna (evento tipo vacuna)

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"event_type_id":1,"body":"Vacuna antirrábica","pet_id":1,"status":"completado","alarm_at":"2025-07-01T10:00:00Z"}'
```

## Próximo evento de tipo (vacuna/desparasitacion) para mascota

```bash
curl http://localhost:3000/pets/1/next-event/1
```

## Registrar próxima compra de alimento

```bash
curl -X POST http://localhost:3000/pets/1/next-food-purchase \
  -H "Content-Type: application/json" \
  -d '{"body":"Compra de alimento 10kg","status":"pendiente","alarm_at":"2025-08-01T10:00:00Z"}'
```

## Ajustar fecha de compra de alimento

```bash
curl -X PUT http://localhost:3000/events/1 \
  -H "Content-Type: application/json" \
  -d '{"alarm_at":"2025-09-01T10:00:00Z"}'
```

## Histórico de eventos de una mascota

```bash
curl http://localhost:3000/pets/1/events
```

## Login por correo electrónico

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@correo.com"}'
```

## Listar razas

```bash
curl http://localhost:3000/breeds
```

## Próximos eventos de una mascota

```bash
curl http://localhost:3000/pets/1/upcoming-events
```

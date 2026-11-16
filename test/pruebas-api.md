# Pruebas de API - INTEC Backend

A continuación se documentan las pruebas realizadas a los endpoints del backend utilizando Postman.

## 1. Login (Obtener Token)
- **Método:** POST
- **URL:** `http://localhost:3000/api/login`
- **Body:** `{ "usuario": "admin", "contraseña": "1234" }`
- **Respuesta:** `{ "token": "eyJhbGci..." }`

## 2. Crear Usuario
- **Método:** POST
- **URL:** `http://localhost:3000/api/usuarios`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "nombre": "Jaime Pinzon", "email": "jaime@intec.edu.co", "password": "123456" }`
- **Respuesta:** `{ "id": 1, "nombre": "Jaime Pinzon", ... }`

## 3. Consultar Usuarios
- **Método:** GET
- **URL:** `http://localhost:3000/api/usuarios`
- **Headers:** `Authorization: Bearer <token>`
- **Respuesta:** `[ { "id": 1, "nombre": "Jaime Pinzon", ... } ]`

## 4. Actualizar Usuario
- **Método:** PUT
- **URL:** `http://localhost:3000/api/usuarios/1`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "nombre": "Jaime Pinzon Actualizado", "email": "jaime.nuevo@intec.edu.co" }`
- **Respuesta:** `{ "message": "Usuario actualizado correctamente" }`

## 5. Eliminar Usuario
- **Método:** DELETE
- **URL:** `http://localhost:3000/api/usuarios/2`
- **Headers:** `Authorization: Bearer <token>`
- **Respuesta:** `{ "message": "Usuario eliminado correctamente" }`
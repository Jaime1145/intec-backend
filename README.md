# INTEC - Backend API

Este es el backend del Sistema de Gestión Académica para el Instituto INTEC. Proporciona una API REST para la gestión de usuarios y matrículas, con autenticación segura mediante JWT.

## Tecnologías utilizadas
- Node.js
- Express
- MySQL (mysql2)
- JSON Web Tokens (JWT)
- Postman (para pruebas)

## Requisitos previos
- Node.js instalado
- MySQL (o XAMPP) corriendo

## Instalación y ejecución
1. Clona el repositorio:
   git clone https://github.com/Jaime1145/intec-backend.git
2. Instala las dependencias:
   npm install
3. Configura tu base de datos en `app/config/db.js` (usuario, contraseña y puerto).
4. Ejecuta el servidor:
   npm run dev
5. El servidor estará disponible en `http://localhost:3000`.

## Endpoints principales
- POST /api/login - Autenticación y generación de token.
- GET /api/usuarios - Listar usuarios (requiere token).
- POST /api/usuarios - Crear usuario (requiere token).
- PUT /api/usuarios/:id - Actualizar usuario (requiere token).
- DELETE /api/usuarios/:id - Eliminar usuario (requiere token).

---
Desarrollado por **Jaime Alberto Pinzon Hernandez** - Ficha 3186583
-- INTEC - Esquema de base de datos (MySQL 8)
-- Cargar en local:
--   docker compose exec -T db mysql -uroot -proot intec_db < schema.sql

SET NAMES utf8mb4;

-- 1. Usuarios del sistema (admin, secretaria). Es la tabla que ya usa tu backend.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','secretaria') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Programas ofrecidos (un mismo programa puede existir como tecnico y como tecnologo)
CREATE TABLE IF NOT EXISTS programas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  nivel ENUM('tecnico','tecnologo') NOT NULL,
  duracion_meses INT NULL,            -- 4, 6, 12, 24...
  valor_total DECIMAL(12,2) NULL,     -- desde 500.000 en adelante
  activo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_programa_nivel (nombre, nivel)
);

-- 3. Estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento ENUM('CC','TI','CE','PPT','PASAPORTE') NOT NULL DEFAULT 'CC',
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  telefono VARCHAR(20) NULL,
  ciudad VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Matriculas (estudiante + programa + periodo)
CREATE TABLE IF NOT EXISTS matriculas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NOT NULL,
  programa_id INT NOT NULL,
  periodo VARCHAR(20) NOT NULL,       -- ej. 2026-2
  fecha_matricula DATE NOT NULL,
  estado ENUM('pendiente','activa','retirada','graduada') NOT NULL DEFAULT 'pendiente',
  valor_total DECIMAL(12,2) NOT NULL,
  num_cuotas INT NOT NULL DEFAULT 1,
  ultimo_acceso DATE NULL,            -- ultimo ingreso a la plataforma (alertas de desercion)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  FOREIGN KEY (programa_id) REFERENCES programas(id),
  UNIQUE KEY uq_matricula (estudiante_id, programa_id, periodo)
);

-- 5. Cuotas / pagos de cada matricula
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula_id INT NOT NULL,
  numero_cuota INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE NULL,
  metodo VARCHAR(30) NULL,            -- efectivo, transferencia, etc.
  estado ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_cuota (matricula_id, numero_cuota)
);

-- 6. Documentos emitidos (base del generador de PDF y de la verificacion por QR)
CREATE TABLE IF NOT EXISTS documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo CHAR(12) NOT NULL UNIQUE,    -- codigo publico que va en el QR
  tipo ENUM('constancia','recibo','certificado') NOT NULL,
  matricula_id INT NOT NULL,
  pago_id INT NULL,                   -- solo para recibos
  emitido_por INT NULL,
  vigente TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matricula_id) REFERENCES matriculas(id),
  FOREIGN KEY (pago_id) REFERENCES pagos(id),
  FOREIGN KEY (emitido_por) REFERENCES usuarios(id)
);

-- Datos iniciales: los 7 programas con nivel tecnico.
-- Duracion y valor quedan en NULL: completalos con UPDATE segun tu oferta real,
-- y agrega las filas de tecnologo que correspondan.
INSERT IGNORE INTO programas (nombre, nivel) VALUES
  ('Seguridad Vial', 'tecnico'),
  ('Preescolar y Primera Infancia', 'tecnico'),
  ('Manejo de Drones', 'tecnico'),
  ('Contabilidad', 'tecnico'),
  ('Maquinaria Amarilla', 'tecnico'),
  ('Salud Ocupacional', 'tecnico'),
  ('Agente de Transito', 'tecnico');

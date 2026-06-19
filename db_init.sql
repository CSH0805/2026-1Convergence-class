-- Calmmate DB 초기화
-- MySQL에서 한 번만 실행하면 됩니다.

CREATE DATABASE IF NOT EXISTS calmmate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE calmmate;

CREATE TABLE IF NOT EXISTS users (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  google_id     VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  profile_image TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 추후 추가될 테이블 예시 (지금은 실행 안 해도 됨)
-- CREATE TABLE characters (
--   id         INT AUTO_INCREMENT PRIMARY KEY,
--   user_id    INT NOT NULL,
--   type       ENUM('dog','cat','quokka','rat') NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- CREATE TABLE diagnoses (
--   id              INT AUTO_INCREMENT PRIMARY KEY,
--   user_id         INT NOT NULL,
--   attachment_type ENUM('avoidant','anxious','secure','neglected') NOT NULL,
--   report_url      TEXT,
--   created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

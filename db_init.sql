-- Calmmate DB 초기화
-- MySQL에서 한 번만 실행하면 됩니다.

CREATE DATABASE IF NOT EXISTS calmmate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE calmmate;

-- 1. 유저
CREATE TABLE IF NOT EXISTS users (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  google_id     VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  profile_image TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 상담 세션
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  `character`  ENUM('dog','cat','quokka','mouse') NOT NULL,
  status       ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 상담 메시지 (질문-답변 1턴 = 1행)
CREATE TABLE IF NOT EXISTS counseling_messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT NOT NULL,
  question_number TINYINT NOT NULL,
  ai_message      TEXT NOT NULL,
  user_answer     TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES counseling_sessions(id) ON DELETE CASCADE
);

-- 4. 애착유형 진단 결과 (세션당 1개)
CREATE TABLE IF NOT EXISTS diagnoses (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT NOT NULL UNIQUE,
  attachment_type ENUM('avoidant','anxious','secure','neglected') NOT NULL,
  reasoning       TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES counseling_sessions(id) ON DELETE CASCADE
);

-- 5. 생성된 PDF 파일 메타데이터
CREATE TABLE IF NOT EXISTS pdfs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id    INT NOT NULL,
  file_path  VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. 마인드맵 키워드 (노드-엣지 구조)
CREATE TABLE IF NOT EXISTS keywords (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  session_id       INT NOT NULL,
  keyword          VARCHAR(100) NOT NULL,
  related_keyword  VARCHAR(100) NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES counseling_sessions(id) ON DELETE CASCADE
);

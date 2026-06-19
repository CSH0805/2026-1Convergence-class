require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const counselingRoutes = require('./src/routes/counselingRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// 라우터
app.use('/auth', authRoutes);
app.use('/counseling', counselingRoutes);

// 헬스체크
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Calmmate 서버 실행 중: http://localhost:${PORT}`);
  console.log(`환경: ${process.env.NODE_ENV}`);
});

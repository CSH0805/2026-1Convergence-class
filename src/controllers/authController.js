const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 개발 모드 전용: 실제 구글 토큰 검증 없이 테스트 유저 반환
async function verifyGoogleTokenDev(idToken) {
  if (idToken === 'dev-test-token') {
    return {
      sub: 'dev_google_id_12345',
      email: 'dev@test.com',
      name: '개발자테스트',
      picture: null,
    };
  }
  throw new Error('개발 모드에서는 "dev-test-token"만 허용됩니다.');
}

async function verifyGoogleToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture || null,
  };
}

function issueJwt(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'idToken이 필요합니다.' });
  }

  // 1단계: 토큰 검증
  let payload;
  try {
    const isDev = process.env.NODE_ENV === 'development';
    payload = isDev
      ? await verifyGoogleTokenDev(idToken).catch(() => verifyGoogleToken(idToken))
      : await verifyGoogleToken(idToken);
  } catch (err) {
    console.error('[토큰 오류]', err.message);
    return res.status(401).json({ error: '구글 토큰 검증에 실패했습니다.' });
  }

  // 2단계: DB 조회/저장
  try {
    let user = await userModel.findByGoogleId(payload.sub);
    if (!user) {
      user = await userModel.createUser({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        profileImage: payload.picture,
      });
    }

    const accessToken = issueJwt(user);
    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('[DB 오류]', err.message);
    return res.status(500).json({ error: 'DB 오류: ' + err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    return res.json({ user });
  } catch (err) {
    console.error('getMe 오류:', err.message);
    return res.status(500).json({ error: '서버 오류' });
  }
};

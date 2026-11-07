const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, dbConfig } = require('../config/db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập username và password' });
  }
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE Username = @username');
    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = jwt.sign(
      { id: user.Id, username: user.Username },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '8h' }
    );
    res.json({ token, username: user.Username });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
});

module.exports = router;

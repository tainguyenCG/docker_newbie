const router = require('express').Router();
const { sql, dbConfig } = require('../config/db');
const auth = require('../middleware/auth');

// Public: danh sách toàn bộ nội dung landing page
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(
      `SELECT Id, SectionKey, Title, Subtitle, Description, SortOrder, UpdatedAt
       FROM SiteContent
       ORDER BY SortOrder, Id`
    );
    res.json(result.recordset);
  } catch (err) {
    console.error('[content] list error:', err.message);
    res.status(500).json({ message: 'Lỗi server khi lấy nội dung' });
  }
});

// Protected: tạo mục mới
router.post('/', auth, async (req, res) => {
  const { sectionKey, title = null, subtitle = null, description = null, sortOrder = 0 } = req.body || {};
  if (!sectionKey) {
    return res.status(400).json({ message: 'sectionKey là bắt buộc' });
  }
  try {
    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input('key', sql.NVarChar, sectionKey)
      .input('title', sql.NVarChar, title)
      .input('subtitle', sql.NVarChar, subtitle)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('sortOrder', sql.Int, sortOrder)
      .query(
        `INSERT INTO SiteContent (SectionKey, Title, Subtitle, Description, SortOrder)
         VALUES (@key, @title, @subtitle, @description, @sortOrder)`
      );
    res.status(201).json({ message: 'Đã tạo mục mới' });
  } catch (err) {
    if (err.number === 2601 || err.number === 2627) {
      return res.status(409).json({ message: 'SectionKey đã tồn tại' });
    }
    console.error('[content] create error:', err.message);
    res.status(500).json({ message: 'Lỗi server khi tạo mục' });
  }
});

// Protected: cập nhật mục theo Id
router.put('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Id không hợp lệ' });
  }
  const { title = null, subtitle = null, description = null, sortOrder = 0 } = req.body || {};
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('title', sql.NVarChar, title)
      .input('subtitle', sql.NVarChar, subtitle)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('sortOrder', sql.Int, sortOrder)
      .query(
        `UPDATE SiteContent
         SET Title = @title, Subtitle = @subtitle, Description = @description,
             SortOrder = @sortOrder, UpdatedAt = GETDATE()
         WHERE Id = @id`
      );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mục' });
    }
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    console.error('[content] update error:', err.message);
    res.status(500).json({ message: 'Lỗi server khi cập nhật mục' });
  }
});

// Protected: xóa mục theo Id
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Id không hợp lệ' });
  }
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM SiteContent WHERE Id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mục' });
    }
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    console.error('[content] delete error:', err.message);
    res.status(500).json({ message: 'Lỗi server khi xóa mục' });
  }
});

module.exports = router;

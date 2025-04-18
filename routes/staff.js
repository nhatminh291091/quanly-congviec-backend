const express = require('express');
const router = express.Router();
const { getChuyenVienList } = require('../utils/sheetReader');

router.get('/', async (req, res) => {
  try {
    const list = await getChuyenVienList();
    res.json(list);
  } catch (error) {
    console.error('Lỗi khi đọc sheet DULIEU:', error);
    res.status(500).json({ error: 'Không đọc được danh sách chuyên viên' });
  }
});

module.exports = router;

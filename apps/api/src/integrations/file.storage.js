/** File Storage - Cloudinary / Local storage integration */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max
module.exports = { upload };

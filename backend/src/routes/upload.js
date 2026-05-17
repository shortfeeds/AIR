const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const auth = require('../middleware/auth');
const path = require('path');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed!'));
  }
});

router.post('/kyc', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.S3_BUCKET_NAME) {
      return res.status(500).json({ error: 'S3 bucket is not configured on the server' });
    }

    const s3 = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      }
    });

    const fileExt = path.extname(req.file.originalname);
    const key = `kyc/${req.user.id}-${Date.now()}${fileExt}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read' // Assumes public read is allowed, or you can construct a private bucket flow if using presigned views, but public-read or using custom endpoint is standard for hosting logos/kyc
    }));

    // If using Cloudflare R2 or custom endpoint, URL construction might depend on S3_ENDPOINT
    let fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    if (process.env.S3_ENDPOINT) {
      fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${key}`;
      // In some custom setups like R2, it's custom_domain/key. But this is the safest default construction.
    }

    res.json({ url: fileUrl });
  } catch (err) {
    console.error('KYC upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload KYC document' });
  }
});

module.exports = router;

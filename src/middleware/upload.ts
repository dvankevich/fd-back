import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");

// Створюємо папку uploads, якщо її немає
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const uploadAvatar = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("avatar")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Ліміт розміру, неочікуване поле тощо
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(createHttpError(400, "File too large (max 5MB)"));
      }
      return next(createHttpError(400, err.message));
    }

    if (err) {
      // fileFilter (не зображення)
      return next(createHttpError(400, err.message));
    }

    next();
  });
};


import type { Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { BadRequestError } from "../exceptions/errors.ts";
import { UPLOAD_ERROR, UPLOAD_LIMITS } from "./upload.limits.ts";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const BYTES_PER_MEGABYTE = 1024 * 1024;

const RANDOM_SUFFIX_RANGE = 1e9;

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * RANDOM_SUFFIX_RANGE)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_LIMITS.fileSizeMb * BYTES_PER_MEGABYTE,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error(UPLOAD_ERROR.notAnImage));
    }
  },
});

const toUploadError = (err: unknown): BadRequestError => {
  if (err instanceof multer.MulterError) {
    return new BadRequestError(err.code === "LIMIT_FILE_SIZE" ? UPLOAD_ERROR.tooLarge : err.message);
  }
  return new BadRequestError(err instanceof Error ? err.message : UPLOAD_ERROR.notAnImage);
};

export const createSingleFileUpload =
  (field: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err) => {
      next(err ? toUploadError(err) : undefined);
    });
  };

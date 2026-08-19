import type { ImageStorage } from "./domain/image-storage.port.ts";
import { CloudinaryImageStorage, type ImageUploader } from "./infrastructure/cloudinary-image.storage.ts";
import cloudinary from "./infrastructure/cloudinary.client.ts";

export type MediaModule = { imageStorage: ImageStorage };

export const createMediaModule = (uploader: ImageUploader = cloudinary.uploader): MediaModule => ({
  imageStorage: new CloudinaryImageStorage(uploader),
});

export const mediaModule = createMediaModule();

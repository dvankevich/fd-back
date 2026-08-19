import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { BadRequestError } from "../../../core/exceptions/errors.ts";
import { isNumber, isRecord, isString } from "../../../core/guards.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { ImageStorage, UploadImageInput, UploadedImage } from "../domain/image-storage.port.ts";
import { MEDIA_MESSAGE } from "../domain/media.messages.ts";

const INVALID_IMAGE = { message: MEDIA_MESSAGE.invalidImage, marker: "invalid image" } as const;

export type ImageUploader = {
  upload(path: string, options: UploadApiOptions): Promise<UploadApiResponse>;
};

const isRejectedImage = (err: unknown): boolean => {
  if (!isRecord(err)) {
    return false;
  }
  const rejectedByApi = isNumber(err.http_code) && err.http_code === HTTP_STATUS.badRequest;
  const rejectedByMessage =
    isString(err.message) && err.message.toLowerCase().includes(INVALID_IMAGE.marker);
  return rejectedByApi || rejectedByMessage;
};

const rethrowRejectedImage = (err: unknown): never => {
  if (isRejectedImage(err)) {
    throw new BadRequestError(INVALID_IMAGE.message);
  }
  throw err;
};

export class CloudinaryImageStorage implements ImageStorage {
  constructor(private readonly uploader: ImageUploader) {}

  async upload({
    path,
    folder,
    publicId,
    overwrite,
    transformation,
  }: UploadImageInput): Promise<UploadedImage> {
    const result = await this.uploader
      .upload(path, { folder, public_id: publicId, overwrite, transformation: [transformation] })
      .catch(rethrowRejectedImage);

    return { url: result.secure_url };
  }
}

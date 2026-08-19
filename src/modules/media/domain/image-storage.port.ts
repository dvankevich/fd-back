export type ImageTransformation = {
  width: number;
  height: number;
  crop: string;
  gravity?: string;
};

export type UploadImageInput = {
  path: string;
  folder: string;
  publicId?: string;
  overwrite?: boolean;
  transformation: ImageTransformation;
};

export type UploadedImage = { url: string };

export interface ImageStorage {
  upload(input: UploadImageInput): Promise<UploadedImage>;
}

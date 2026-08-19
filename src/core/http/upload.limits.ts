export const UPLOAD_LIMITS = { fileSizeMb: 5 } as const;

export const UPLOAD_ERROR = {
  tooLarge: `File too large (max ${UPLOAD_LIMITS.fileSizeMb}MB)`,
  notAnImage: "Only image files are allowed",
} as const;

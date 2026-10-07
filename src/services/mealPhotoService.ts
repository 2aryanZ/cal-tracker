import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImageRef } from 'expo-image-manipulator';

export interface MealPhotoInput {
  uri: string;
  width: number;
  height: number;
}
export interface PreparedMealPhoto extends MealPhotoInput {
  base64: string;
  mimeType: 'image/jpeg';
}
function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('Photo analysis cancelled.');
}

/** Keep photo uploads small and normalize HEIC/PNG camera-library assets to JPEG. */
export async function prepareMealPhoto(
  photo: MealPhotoInput,
  signal?: AbortSignal,
  maxEdge = 1280,
): Promise<PreparedMealPhoto> {
  checkCancelled(signal);
  if (!photo.uri || ![photo.width, photo.height, maxEdge].every(
    (value) => Number.isFinite(value) && value > 0,
  )) throw new Error('Unable to read this photo. Choose another image.');
  const context = ImageManipulator.manipulate(photo.uri);
  let rendered: ImageRef | undefined;
  try {
    const scale = Math.min(1, maxEdge / Math.max(photo.width, photo.height));
    if (scale < 1) context.resize({
      width: Math.max(1, Math.round(photo.width * scale)),
      height: Math.max(1, Math.round(photo.height * scale)),
    });
    rendered = await context.renderAsync();
    checkCancelled(signal);
    const image = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.75,
      base64: true,
    });
    checkCancelled(signal);
    if (!image.base64 || image.base64.length > 4_000_000)
      throw new Error('This photo is too large to analyze. Retake it or choose a smaller image.');
    return { ...image, base64: image.base64, mimeType: 'image/jpeg' };
  } finally {
    rendered?.release();
    context.release();
  }
}

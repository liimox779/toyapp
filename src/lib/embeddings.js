import { pipeline, RawImage, env } from '@xenova/transformers';

// Keep everything local/in-memory; no need to write cached models to a browser-style cache dir.
env.allowLocalModels = false;

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

let extractorPromise = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('image-feature-extraction', MODEL_ID);
  }
  return extractorPromise;
}

async function embedRawImage(image) {
  const extractor = await getExtractor();
  const output = await extractor(image, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function embedImageFromUrl(url) {
  const image = await RawImage.fromURL(url);
  return embedRawImage(image);
}

export async function embedImageFromBuffer(buffer) {
  const blob = new Blob([buffer]);
  const image = await RawImage.fromBlob(blob);
  return embedRawImage(image);
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

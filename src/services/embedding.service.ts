import crypto from 'crypto';
import { cacheGet, cacheSet, CACHE_TTL } from '../lib/cache';
import { openaiBreaker } from '../lib/http/openai.breaker';
import { logger } from '../lib/logger';
import { appEvents } from '../lib/events';
import { embeddingsRepository } from '../repositories/embeddings.repository';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const startTime = Date.now();

  const response = await openaiBreaker.fire('/embeddings', {
    input: text,
    model: EMBEDDING_MODEL,
  });

  const embedding = response.data.data[0].embedding;
  const duration = Date.now() - startTime;

  logger.info('Embedding generated', {
    model: EMBEDDING_MODEL,
    inputLength: text.length,
    dimensions: embedding.length,
    durationMs: duration,
    tokensUsed: response.data.usage?.total_tokens,
  });

  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // OpenAI supports up to 2048 inputs per request
  const BATCH_SIZE = 100; // Stay well under the limit
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await openaiBreaker.fire('/embeddings', {
      input: batch,
      model: EMBEDDING_MODEL,
    });

    // Sort by index to maintain order
    const sorted = response.data.data.sort((a: any, b: any) => a.index - b.index);

    for (const item of sorted) {
      allEmbeddings.push(item.embedding);
    }

    logger.info('Embedding batch processed', {
      batchIndex: Math.floor(i / BATCH_SIZE),
      batchSize: batch.length,
      totalTexts: texts.length,
      tokensUsed: response.data.usage?.total_tokens,
    });
  }

  return allEmbeddings;
}

export async function storeChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`;
  return embeddingsRepository.createChunkEmbedding(chunkId, vectorStr);
}

export async function storeChunkEmbeddingsBatch(
  chunks: { id: string; embedding: number[] }[],
): Promise<void> {
  return embeddingsRepository.createChunkEmbeddingsBatch(chunks);
}

function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function generateEmbeddingCached(
  text: string,
  context: { userId?: string; documentId?: string } = {},
): Promise<number[]> {
  const { userId, documentId } = context;
  const hash = contentHash(text);
  const cacheKey = `embed:${hash}`;

  const cached = await cacheGet<number[]>(cacheKey);
  if (cached) {
    logger.debug('Embedding cache hit', { hash: hash.substring(0, 12) });
    return cached;
  }

  const embedding = await generateEmbedding(text);
  appEvents.emit('ai:embedding-generated', {
    userId,
    documentId,
    model: EMBEDDING_MODEL,
    tokensUsed: Math.max(1, Math.ceil(text.length / 4)),
    costUsd: 0,
    cached: false,
  });

  await cacheSet(cacheKey, embedding, CACHE_TTL.EMBEDDING);

  logger.debug('Embedding cached', { hash: hash.substring(0, 12) });
  return embedding;
}

export async function generateEmbeddingsBatchCached(
  texts: string[],
  context: { userId?: string; documentId?: string } = {},
): Promise<number[][]> {
  const { userId, documentId } = context;
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const uncached: { index: number; text: string }[] = [];

  // 1. Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const hash = contentHash(texts[i]);
    const cached = await cacheGet<number[]>(`embed:${hash}`);
    if (cached) {
      results[i] = cached;
    } else {
      uncached.push({ index: i, text: texts[i] });
    }
  }

  logger.info('Embedding batch cache check', {
    total: texts.length,
    cacheHits: texts.length - uncached.length,
    cacheMisses: uncached.length,
  });

  // 2. Generate embeddings only for uncached texts
  if (uncached.length > 0) {
    const newEmbeddings = await generateEmbeddings(uncached.map((u) => u.text));

    appEvents.emit('ai:embedding-generated', {
      userId,
      documentId,
      model: EMBEDDING_MODEL,
      tokensUsed: uncached.reduce((sum, item) => sum + Math.max(1, Math.ceil(item.text.length / 4)), 0),
      costUsd: 0,
      cached: false,
    });

    // 3. Cache the new embeddings and fill in results
    for (let i = 0; i < uncached.length; i++) {
      const hash = contentHash(uncached[i].text);
      await cacheSet(`embed:${hash}`, newEmbeddings[i], CACHE_TTL.EMBEDDING);
      results[uncached[i].index] = newEmbeddings[i];
    }
  }

  return results as number[][];
}

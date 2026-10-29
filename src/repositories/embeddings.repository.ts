import { prisma } from '../lib/prisma';
import { storeChunkEmbedding } from '../services/embedding.service';

export const embeddingsRepository = {
  async createChunkEmbedding(chunkId: String, vectorStr: String) {
    await prisma.$executeRaw`
        UPDATE "Chunk"
        SET embedding = ${vectorStr}::vector
        WHERE id = ${chunkId}
    `;
  },
  async createChunkEmbeddingsBatch(chunks: { id: string; embedding: number[] }[]) {
    await prisma.$transaction(
      chunks.map((chunk) => {
        const vectorStr = `[${chunk.embedding.join(',')}]`;
        return prisma.$executeRaw`
            UPDATE "Chunk"
            SET embedding = ${vectorStr}::vector
            WHERE id = ${chunk.id}
        `;
      }),
    );
  },
};

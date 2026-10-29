interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
  minChunkTokens?: number;
}

interface ChunkSource {
  text: string;
  startChar: number;
}

interface Chunk {
  text: string;
  index: number;
  tokenEstimate: number;
  metadata: {
    startChar: number;
    endChar: number;
  };
}

const SEPARATORS = [
  '\n\n', // Paragraphs
  '\n', // Lines
  '. ', // Sentences
  '? ', // Questions
  '! ', // Exclamations
  ' ', // Words (last resort)
];

export function chunkDocument(text: string, options: ChunkOptions = {}): Chunk[] {
  const { maxTokens = 500, overlapTokens = 50, minChunkTokens = 50 } = options;

  const rawChunks: ChunkSource[] = recursiveSplit(text, SEPARATORS, maxTokens);
  const withOverlap: ChunkSource[] = addOverlap(rawChunks, overlapTokens);

  return withOverlap
    .filter((c) => estimateTokens(c.text) >= minChunkTokens)
    .map((c, index): Chunk => {
      const tokenEstimate = estimateTokens(c.text);

      return {
        text: c.text,
        index,
        tokenEstimate,
        metadata: {
          startChar: c.startChar,
          endChar: c.startChar + c.text.length,
        },
      };
    });
}

export function splitIntoChunks(text: string, maxTokens = 500): string[] {
  return chunkDocument(text, { maxTokens }).map((chunk) => chunk.text);
}

function recursiveSplit(
  text: string,
  separators: string[],
  maxTokens: number,
): ChunkSource[] {
  if (estimateTokens(text) <= maxTokens) {
    return [{ text, startChar: 0 }];
  }

  // Find the first separator that actually splits the text
  for (const sep of separators) {
    const parts = text.split(sep).filter((p) => p.trim());
    if (parts.length <= 1) continue;

    const chunks: ChunkSource[] = [];
    let current = '';
    let charOffset = 0;
    let chunkStart = 0;

    for (const part of parts) {
      const combined = current ? current + sep + part : part;

      if (estimateTokens(combined) > maxTokens && current) {
        chunks.push({ text: current.trim(), startChar: chunkStart });
        current = part;
        chunkStart = charOffset;
      } else {
        if (!current) chunkStart = charOffset;
        current = combined;
      }

      charOffset += part.length + sep.length;
    }

    if (current.trim()) {
      chunks.push({ text: current.trim(), startChar: chunkStart });
    }

    // Recursively split any chunks that are still too big
    return chunks.flatMap((chunk) => {
      if (estimateTokens(chunk.text) > maxTokens) {
        const remaining = separators.slice(separators.indexOf(sep) + 1);
        if (remaining.length > 0) {
          return recursiveSplit(chunk.text, remaining, maxTokens);
        }
      }
      return [chunk];
    });
  }

  // No separator worked. Return the text as-is.
  return [{ text, startChar: 0 }];
}

function addOverlap(
  chunks: ChunkSource[],
  overlapTokens: number,
): ChunkSource[] {
  if (overlapTokens === 0 || chunks.length <= 1) return chunks;

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;

    const prevText = chunks[i - 1].text;
    const overlapText = getLastNTokens(prevText, overlapTokens);

    return {
      text: overlapText + '\n' + chunk.text,
      startChar: chunk.startChar,
    };
  });
}

function getLastNTokens(text: string, n: number): string {
  const words = text.split(/\s+/);
  const wordsNeeded = Math.ceil(n / 1.3);
  return words.slice(-wordsNeeded).join(' ');
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

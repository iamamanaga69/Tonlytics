/**
 * Computes the cosine similarity between two numeric vectors.
 * Returns a score between -1 and 1 representing semantic alignment.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector lengths do not match: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate standard text embeddings.
 * Preparation skeleton for OpenAI text-embedding-3-small or Gemini text-embedding-004.
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          input: text.replace(/\n/g, ' '),
          model: 'text-embedding-3-small'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embedding API returned: ${response.statusText}`);
      }

      const json = await response.json();
      return json.data[0].embedding;
    } catch (error) {
      console.error('[EMBEDDINGS] OpenAI API call failed:', error);
      throw error;
    }
  }

  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: text.replace(/\n/g, ' ') }] }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini Embedding API returned: ${response.statusText}`);
      }

      const json = await response.json();
      return json.embedding.values;
    } catch (error) {
      console.error('[EMBEDDINGS] Gemini API call failed:', error);
      throw error;
    }
  }

  // No API key present — return mock 1536-dimensional vector for offline local testing
  const mockVector = new Array(1536).fill(0).map((_, i) => {
    const freq = (text.length + i) % 100;
    return Math.sin(freq) / 10;
  });
  return mockVector;
}

/**
 * Calculate standard duplicate probability based on semantic distance.
 */
export async function calculateDuplicateProbability(textA: string, textB: string): Promise<number> {
  try {
    const embA = await generateTextEmbedding(textA);
    const embB = await generateTextEmbedding(textB);
    const similarity = cosineSimilarity(embA, embB);
    
    // Map cosine similarity [-1, 1] to probability [0, 100]
    const probability = Math.round(((similarity + 1) / 2) * 100);
    return probability;
  } catch {
    return 0;
  }
}

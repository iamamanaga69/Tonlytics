import { MeiliSearch } from 'meilisearch';
import type { Briefing } from 'types';

export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
export const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || 'masterKey';

let searchClient: MeiliSearch | null = null;

/**
 * Get or initialize a Meilisearch client.
 */
export function getSearchClient(): MeiliSearch | null {
  if (process.env.NODE_ENV === 'test') return null;
  
  if (!searchClient) {
    try {
      searchClient = new MeiliSearch({
        host: MEILISEARCH_HOST,
        apiKey: MEILISEARCH_API_KEY
      });
    } catch (err) {
      console.error('[SEARCH] Failed to configure Meilisearch client:', err);
    }
  }
  return searchClient;
}

export const BRIEFINGS_INDEX_NAME = 'briefings';

/**
 * Push an approved briefing to the Meilisearch index for high-speed instant search.
 */
export async function indexBriefing(briefing: Briefing): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.index(BRIEFINGS_INDEX_NAME);
    
    // Format searchable document structure
    const document = {
      id: briefing.id,
      title: briefing.title,
      slug: briefing.slug,
      briefing: briefing.briefing,
      why_it_matters: briefing.why_it_matters,
      category: briefing.category,
      tags: briefing.tags,
      source_name: briefing.source_name,
      key_takeaways: briefing.key_takeaways,
      published_at: new Date(briefing.published_at).getTime()
    };

    await index.addDocuments([document]);
  } catch (error) {
    console.error(`[SEARCH] Failed to index briefing ${briefing.id}:`, error);
  }
}

/**
 * Remove a briefing document from Meilisearch index (e.g. if discarded or archived).
 */
export async function deindexBriefing(briefingId: string): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.index(BRIEFINGS_INDEX_NAME);
    await index.deleteDocument(briefingId);
  } catch (error) {
    console.error(`[SEARCH] Failed to deindex briefing ${briefingId}:`, error);
  }
}

/**
 * Executes high-speed instant typo-tolerant search across indexing attributes.
 */
export async function searchEcosystemBriefings(query: string, limit = 20): Promise<string[]> {
  const client = getSearchClient();
  if (!client) return [];

  try {
    const index = client.index(BRIEFINGS_INDEX_NAME);
    const searchRes = await index.search(query, {
      limit,
      attributesToRetrieve: ['id']
    });
    
    return searchRes.hits.map(hit => hit.id);
  } catch (error) {
    console.error('[SEARCH] Meilisearch query failed:', error);
    return [];
  }
}

/**
 * Pre-configures search indexes and search rankings.
 */
export async function setupSearchIndexConfig(): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.index(BRIEFINGS_INDEX_NAME);
    
    await index.updateSettings({
      searchableAttributes: [
        'title',
        'key_takeaways',
        'why_it_matters',
        'briefing',
        'tags',
        'category'
      ],
      filterableAttributes: ['category', 'tags'],
      sortableAttributes: ['published_at']
    });
  } catch (error) {
    console.error('[SEARCH] Failed to setup index configuration:', error);
  }
}

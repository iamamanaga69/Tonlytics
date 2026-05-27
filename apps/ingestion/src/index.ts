import { dbService } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { fetchRssFeed, extractOpenGraph, parseGithubReleases } from 'extraction';
import { VERIFIED_SOURCES, TRUST_THRESHOLDS } from 'config';

logInfo('[INGESTION] Bootstrapping Tonlytics crawler playground...');

// Whitelist and relevance helpers
const TRUSTED_DOMAINS = ['ton.org', 'telegram.org', 'github.com', 'ston.fi', 'getgems.io'];
const RELEVANCE_KEYWORDS = ['ton', 'telegram', 'wallet', 'usdt', 'stablecoin', 'jetton', 'nft', 'mini app'];

/**
 * Validate domain credibility.
 */
function isCredibleSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Calculate keyword relevance count.
 */
function getRelevanceCount(title: string, content: string): number {
  const text = `${title} ${content}`.toLowerCase();
  let count = 0;
  RELEVANCE_KEYWORDS.forEach(kw => {
    const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi'));
    if (matches) count += matches.length;
  });
  return count;
}

/**
 * Run a crawler pass across all active whitelisted sources.
 */
export async function runIngestionPass(): Promise<number> {
  logInfo('[INGESTION] Launching active sources ingestion pass...');
  let totalIngested = 0;

  try {
    const sources = await dbService.getSources();
    
    for (const source of sources) {
      if (source.reliability_score < 3) {
        logWarn(`[INGESTION] Skipping source ${source.name} due to low reliability score (${source.reliability_score})`);
        continue;
      }

      logInfo(`[INGESTION] Crawling source "${source.name}" (${source.source_type})...`);

      if (source.source_type === 'github') {
        const releases = await parseGithubReleases(source.url);
        const mapped = releases.slice(0, 3).filter(r => isCredibleSource(source.url) && getRelevanceCount(r.title, r.content) >= 1).map(r => ({
          source_id: source.id,
          external_id: r.tag,
          source_url: `${source.url}/tag/${r.tag}`,
          raw_title: `${source.name}: ${r.title}`,
          raw_content: r.content,
          publish_date: r.date
        }));

        if (mapped.length > 0) {
          const added = await dbService.insertRawUpdates(mapped);
          totalIngested += added;
        }
      } else {
        const items = await fetchRssFeed(source.url);
        const mapped = items.slice(0, 3).filter(i => isCredibleSource(i.link) && getRelevanceCount(i.title, i.content) >= 1).map(i => ({
          source_id: source.id,
          source_url: i.link,
          raw_title: i.title,
          raw_content: i.content,
          publish_date: i.pubDate
        }));

        if (mapped.length > 0) {
          const added = await dbService.insertRawUpdates(mapped);
          totalIngested += added;
        }
      }
    }

    logInfo(`[INGESTION] Ingestion pass completed. Ingested ${totalIngested} new updates.`);
  } catch (error) {
    logError('[INGESTION] Ingestion pass encountered critical failures:', error);
  }

  return totalIngested;
}

// Automatically trigger if run directly
if (require.main === module) {
  runIngestionPass().then((count) => {
    logInfo(`[INGESTION] Playbook run finished. Total updates ingested: ${count}`);
    process.exit(0);
  });
}

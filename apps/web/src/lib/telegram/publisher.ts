import type { Briefing } from '@/types';

/**
 * Escapes common Telegram Markdown control characters to prevent formatting errors
 */
export function escapeMarkdown(text: string): string {
  // Escapes characters that are NOT part of our desired layout formatting
  // Telegram Markdown (v1) parses *, _, [ and `
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/=/g, '\\=');
}

/**
 * Formats a Briefing object into a high-fidelity Markdown channel post
 */
export function formatBriefingForTelegram(briefing: Briefing, baseAppUrl = 'https://tonlytics.xyz'): string {
  const categoryHeader = briefing.category.toUpperCase();
  const escapedTitle = escapeMarkdown(briefing.title);
  const escapedBriefing = escapeMarkdown(briefing.briefing);
  const escapedWhy = escapeMarkdown(briefing.why_it_matters);
  const escapedTags = briefing.tags.map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`).join(' ');

  // Create standard sharing web link
  const webLink = `${baseAppUrl}/briefing/${briefing.slug}`;
  
  // Format matching the exact product style: concise, professional, structured
  return [
    `*📦 ${categoryHeader} BRIEFING*`,
    `*${escapedTitle}*`,
    ``,
    escapedBriefing,
    ``,
    `*💡 Why It Matters:*`,
    escapedWhy,
    ``,
    escapedTags,
    ``,
    `🔗 [Read on Tonlytics Terminal](${webLink})`
  ].join('\n');
}

import HomeExperience from '@/components/editorial/HomeExperience';
import { dbService } from 'database';
import { logError } from 'telemetry';
import type { Briefing } from '@/types';

export const revalidate = 60;

export default async function Home() {
  let briefings: Briefing[] = [];

  try {
    briefings = await dbService.getBriefings();
  } catch (error) {
    logError('[WEB/HOME] Failed to hydrate homepage briefings', error);
  }

  return <HomeExperience initialBriefings={briefings} />;
}

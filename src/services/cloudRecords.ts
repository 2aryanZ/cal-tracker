import type { FoodEntry, WeightEntry, MacroTargets, UserProfile } from '@/types/nutrition';
import type { LocalSnapshot, SyncEntity } from './storage';

export interface CloudRecord {
  entity: SyncEntity;
  record_key: string;
  payload: any;
  deleted: boolean;
  version: number;
}

// Build each index once instead of filtering the entire history for every record.
export function overlayCloudRecords(snapshot: Partial<LocalSnapshot>, records: CloudRecord[]) {
  const hasFoods = records.some(record => record.entity === 'food');
  const hasWeights = records.some(record => record.entity === 'weight');
  const foods = new Map((hasFoods ? snapshot.entries ?? [] : []).map(entry => [entry.id, entry]));
  const weights = new Map((hasWeights ? snapshot.weights ?? [] : []).map(entry => [entry.date, entry]));
  const versions: Record<string, number> = {};
  snapshot.waterLogs = { ...snapshot.waterLogs };
  for (const record of records) {
    const { entity, record_key: key, payload, deleted, version } = record;
    versions[`${entity}:${key}`] = Number(version);
    if (entity === 'food') {
      if (deleted) foods.delete(key);
      else foods.set(key, payload as FoodEntry);
    } else if (entity === 'weight') {
      if (deleted) weights.delete(key);
      else weights.set(key, payload as WeightEntry);
    } else if (entity === 'water') {
      if (deleted) delete snapshot.waterLogs[key];
      else snapshot.waterLogs[key] = payload.waterMl;
    } else if (entity === 'goals' && !deleted) snapshot.goals = payload as MacroTargets;
    else if (entity === 'profile' && !deleted) snapshot.profile = payload as UserProfile;
    else if (entity === 'preferences' && !deleted) {
      for (const field of ['favorites', 'preference', 'notifications', 'badges', 'onboardingDone', 'celebratedDates'] as const)
        if (payload[field] !== undefined) Object.assign(snapshot, { [field]: payload[field] });
    }
  }
  if (hasFoods || !snapshot.entries) snapshot.entries = [...foods.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (hasWeights || !snapshot.weights) snapshot.weights = [...weights.values()].sort((a, b) => b.date.localeCompare(a.date));
  return { snapshot, versions };
}

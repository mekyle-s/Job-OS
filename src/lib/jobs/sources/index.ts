import { GreenhouseAdapter } from './greenhouse';
import type { JobSource } from './adapter';

/**
 * Adapter registry
 *
 * Central registry for all job source adapters.
 * Adding a new source = implement JobSource interface and register here.
 */
const adapters: Record<string, JobSource> = {
  greenhouse: new GreenhouseAdapter(),
};

/**
 * Get adapter by source name
 */
export function getAdapter(source: string): JobSource | null {
  return adapters[source] ?? null;
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): JobSource[] {
  return Object.values(adapters);
}

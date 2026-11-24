import { FlightSearchQuery, FlightOffer } from '@ota/core';

interface CachedEntry {
  offers: FlightOffer[];
  cachedAt: number;
  expiresAt: number;
}

export class LookToBookShield {
  private cache: Map<string, CachedEntry> = new Map();
  private defaultTtlMs = 15 * 60 * 1000; // 15 minutes TTL for flight search cache

  private generateKey(query: FlightSearchQuery): string {
    return `${query.origin}-${query.destination}-${query.departureDate}-${query.returnDate || 'OW'}-${query.cabinClass}`;
  }

  /**
   * Retrieves cached offers if valid, protecting against GDS search query fees
   */
  public getCachedOffers(query: FlightSearchQuery): FlightOffer[] | null {
    const key = this.generateKey(query);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.offers;
  }

  /**
   * Caches supplier responses
   */
  public cacheOffers(query: FlightSearchQuery, offers: FlightOffer[], ttlMs?: number): void {
    const key = this.generateKey(query);
    const now = Date.now();
    this.cache.set(key, {
      offers,
      cachedAt: now,
      expiresAt: now + (ttlMs || this.defaultTtlMs)
    });
  }

  public getCacheMetrics(): { cachedRoutesCount: number } {
    return { cachedRoutesCount: this.cache.size };
  }
}


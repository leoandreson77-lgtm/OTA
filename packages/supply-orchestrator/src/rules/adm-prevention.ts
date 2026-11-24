import { PNRRecord } from '@ota/core';

export interface AdmCheckResult {
  passed: boolean;
  warnings: string[];
  blockingErrors: string[];
  estimatedRiskPenaltyUSD: number;
}

export class AdmPreventionEngine {
  /**
   * Pre-ticketing validation to prevent costly airline Agency Debit Memos (ADMs)
   */
  public static validateBeforeTicketing(pnr: PNRRecord): AdmCheckResult {
    const warnings: string[] = [];
    const blockingErrors: string[] = [];
    let riskPenalty = 0;

    // 1. Ticketing Time Limit (TTL) check
    const ttlDate = new Date(pnr.ticketingTimeLimit).getTime();
    const now = Date.now();
    if (now > ttlDate) {
      blockingErrors.push(`Ticketing Time Limit expired at ${pnr.ticketingTimeLimit}. Ticketing now will trigger an ADM.`);
      riskPenalty += 150;
    } else if (ttlDate - now < 30 * 60 * 1000) {
      warnings.push('PNR is within 30 minutes of TTL expiry. Immediate issuance required.');
    }

    // 2. Churning / Duplicate booking checks
    const paxNames = new Set<string>();
    for (const pax of pnr.passengers) {
      const fullName = `${pax.firstName} ${pax.lastName}`.toLowerCase();
      if (paxNames.has(fullName)) {
        blockingErrors.push(`Duplicate passenger detected: ${fullName}. Churning violation.`);
        riskPenalty += 200;
      }
      paxNames.add(fullName);
    }

    // 3. Married segment logic check
    if (pnr.segments.length > 1) {
      for (let i = 0; i < pnr.segments.length - 1; i++) {
        const segA = pnr.segments[i];
        const segB = pnr.segments[i + 1];
        if (segA.destAirport !== segB.originAirport) {
          warnings.push(`Potential open jaw or un-married segment connection between ${segA.destAirport} and ${segB.originAirport}.`);
        }
      }
    }

    return {
      passed: blockingErrors.length === 0,
      warnings,
      blockingErrors,
      estimatedRiskPenaltyUSD: riskPenalty
    };
  }
}


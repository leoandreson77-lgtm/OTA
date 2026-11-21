import { DisruptionEvent, UnifiedTrip } from '@ota/core';

export interface ProactiveRebookOffer {
  alternativeFlightNumber: string;
  departureTime: string;
  arrivalTime: string;
  carrier: string;
  priceDelta: number; // 0 if covered under airline involuntary disruption policy
  isDirectFlight: boolean;
  freeMealIncluded: boolean;
}

export interface DisruptionOutreachMessage {
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  recipient: string;
  header: string;
  body: string;
  quickReplyOptions: Array<{ actionId: string; label: string }>;
  priorityScore: number;
}

export class ProactiveDisruptionEngine {
  /**
   * Prioritizes travelers when a flight is disrupted (e.g. Flight EK-512 is delayed 240 mins)
   */
  public static calculatePriorityScore(trip: UnifiedTrip, event: DisruptionEvent): number {
    let score = 50;

    // 1. Loyalty Tier boost
    switch (trip.customer.loyaltyTier) {
      case 'PLATINUM':
        score += 40;
        break;
      case 'GOLD':
        score += 25;
        break;
      case 'SILVER':
        score += 15;
        break;
      default:
        score += 5;
    }

    // 2. Disruption severity
    if (event.disruptionType === 'CANCELLATION') {
      score += 30;
    } else if (event.disruptionType === 'DELAY' && (event.delayDurationMinutes || 0) > 180) {
      score += 20;
    }

    // 3. Channel type (Corporate/TMC prioritized for duty of care)
    if (trip.channel === 'CORPORATE_TMC') {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Generates auto-priced rebooking alternatives for the affected traveler
   */
  public static generateAlternativeRebookOffers(
    trip: UnifiedTrip,
    disruptedFlight: string
  ): ProactiveRebookOffer[] {
    const origin = trip.pnrs[0]?.segments[0]?.originAirport || 'DXB';
    const dest = trip.pnrs[0]?.segments[0]?.destAirport || 'LHR';

    return [
      {
        alternativeFlightNumber: `${disruptedFlight.split('-')[0]}-902`,
        carrier: 'Emirates',
        departureTime: '2026-11-22T14:30:00Z',
        arrivalTime: '2026-11-22T18:45:00Z',
        priceDelta: 0, // Covered under waiver
        isDirectFlight: true,
        freeMealIncluded: true
      },
      {
        alternativeFlightNumber: 'BA-108',
        carrier: 'British Airways',
        departureTime: '2026-11-22T16:15:00Z',
        arrivalTime: '2026-11-22T20:30:00Z',
        priceDelta: 0,
        isDirectFlight: true,
        freeMealIncluded: true
      }
    ];
  }

  /**
   * Drafts instant proactive outreach message for WhatsApp or SMS (< 2 min SLA)
   */
  public static createOutreachNotification(
    trip: UnifiedTrip,
    event: DisruptionEvent,
    bestOffer: ProactiveRebookOffer
  ): DisruptionOutreachMessage {
    const priority = this.calculatePriorityScore(trip, event);

    return {
      channel: 'WHATSAPP',
      recipient: trip.customer.phone,
      header: `⚠️ Flight Update: ${event.flightNumber} Delayed`,
      body: `Hello ${trip.customer.name}, we detected that your flight ${event.flightNumber} has been delayed by ${
        event.delayDurationMinutes || 180
      } minutes.
      
To make your journey smooth, we have already pre-held a seat for you on flight ${bestOffer.alternativeFlightNumber} departing at ${bestOffer.departureTime}. 
There is NO extra charge for this rebooking under airline disruption policy.

Reply '1' to confirm this flight, or 'REFUND' to cancel for an immediate full refund.`,
      quickReplyOptions: [
        { actionId: 'ACCEPT_REBOOK', label: `Accept ${bestOffer.alternativeFlightNumber}` },
        { actionId: 'FULL_REFUND', label: 'Claim Full Refund' },
        { actionId: 'TALK_TO_AI', label: 'Explore More Options' }
      ],
      priorityScore: priority
    };
  }
}

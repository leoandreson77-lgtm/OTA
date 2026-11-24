// Vercel Serverless Function entry point for AI-Native OTA Platform API Engine
import { URL } from 'node:url';

// In-memory look-to-book cache (persists during serverless warm container)
const lookToBookCache = new Map();

// Mock Trip Graph
const mockTrip = {
  tripId: 'TRIP-98210',
  bookingReference: 'OTA-2026-EK89',
  channel: 'B2C',
  tenantId: 'global-retail',
  status: 'TICKETED',
  totalAmount: 510.0,
  markupAmount: 25.0,
  commissionAmount: 15.0,
  currency: 'USD',
  customer: {
    customerId: 'CUST-401',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1-415-555-0199',
    loyaltyTier: 'GOLD'
  },
  pnrs: [
    {
      pnrCode: 'X7Q9AB',
      supplier: 'AMADEUS',
      supplierReference: '1A-EK-8912',
      ticketingTimeLimit: '2026-11-23T18:00:00Z',
      isTicketed: true,
      ticketNumbers: ['176-2490192831'],
      segments: [
        {
          segmentId: 'SEG-1',
          flightNumber: 'EK-512',
          carrierCode: 'EK',
          originAirport: 'DXB',
          destAirport: 'LHR',
          departureTime: '2026-11-25T08:15:00Z',
          arrivalTime: '2026-11-25T12:45:00Z',
          cabinClass: 'ECONOMY',
          bookingClass: 'Y',
          fareBasisCode: 'YFLEXOW',
          durationMinutes: 270
        }
      ],
      passengers: [
        {
          id: 'PAX-1',
          paxType: 'ADT',
          title: 'Ms',
          firstName: 'Sarah',
          lastName: 'Jenkins'
        }
      ]
    }
  ],
  payments: [
    {
      paymentId: 'PAY-8812',
      amount: 510.0,
      currency: 'USD',
      status: 'CAPTURED',
      gateway: 'STRIPE',
      transactionRef: 'ch_3N89x1000',
      threeDSecurePassed: true,
      capturedAt: '2026-11-21T10:00:00Z'
    }
  ],
  disruptions: [],
  notes: [],
  createdAt: '2026-11-21T09:55:00Z',
  updatedAt: '2026-11-21T10:00:00Z'
};

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (res.status) return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  const sendJson = (status, data) => {
    if (res.status && res.json) {
      return res.status(status).json(data);
    }
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Body parsing fallback
  let body = req.body;
  if (!body || typeof body === 'string') {
    if (typeof body === 'string' && body.length > 0) {
      try { body = JSON.parse(body); } catch { body = {}; }
    } else {
      body = await new Promise((resolve) => {
        let b = '';
        req.on('data', chunk => b += chunk);
        req.on('end', () => {
          try { resolve(b ? JSON.parse(b) : {}); }
          catch { resolve({}); }
        });
      });
    }
  }

  try {
    // 1. Health Endpoint
    if (pathname === '/health' || pathname === '/api/health') {
      return sendJson(200, {
        status: 'UP',
        service: 'AI-Native OTA Platform Serverless Engine',
        runtime: 'Vercel Edge / Node.js Serverless',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Flight Search Endpoint (Supply Orchestration + Look-to-book shield)
    if (pathname === '/api/flights/search' && method === 'POST') {
      const origin = (body.origin || 'DXB').toUpperCase();
      const dest = (body.destination || 'LHR').toUpperCase();
      const depDate = body.departureDate || '2026-11-25';
      const cabin = body.cabinClass || 'ECONOMY';

      const cacheKey = `${origin}-${dest}-${depDate}-${cabin}`;
      if (lookToBookCache.has(cacheKey)) {
        return sendJson(200, {
          offers: lookToBookCache.get(cacheKey),
          fromCache: true,
          suppliersResponded: ['LOOK_TO_BOOK_SHIELD_CACHE']
        });
      }

      const offers = [
        {
          offerId: `OFFER-AMADEUS-${Date.now()}-1`,
          supplier: 'AMADEUS',
          supplierOfferRef: 'AMA-REF-8912',
          price: { baseFare: 420.0, taxesAndFees: 65.0, markup: 25.0, totalPrice: 510.0, currency: 'USD' },
          segments: [{
            segmentId: 'SEG-1',
            flightNumber: 'EK-512',
            carrierCode: 'EK',
            originAirport: origin,
            destAirport: dest,
            departureTime: `${depDate}T08:15:00Z`,
            arrivalTime: `${depDate}T12:45:00Z`,
            cabinClass: cabin,
            bookingClass: 'Y',
            fareBasisCode: 'YFLEXOW',
            durationMinutes: 270
          }],
          fareBrand: { brandName: 'Standard Flex', cabinClass: cabin, isRefundable: true, changeAllowed: true, changeFeeAmount: 50, cancellationFeeAmount: 75, checkedBaggagePieces: 2 },
          ancillaries: [{ id: 'ANC-1', name: 'Extra 10kg Baggage', price: 45, currency: 'USD' }]
        },
        {
          offerId: `OFFER-NDC-${Date.now()}-2`,
          supplier: 'NDC_DIRECT',
          supplierOfferRef: 'NDC-DIRECT-4401',
          price: { baseFare: 380.0, taxesAndFees: 55.0, markup: 20.0, totalPrice: 455.0, currency: 'USD' },
          segments: [{
            segmentId: 'SEG-2',
            flightNumber: 'BA-107',
            carrierCode: 'BA',
            originAirport: origin,
            destAirport: dest,
            departureTime: `${depDate}T11:30:00Z`,
            arrivalTime: `${depDate}T16:10:00Z`,
            cabinClass: cabin,
            bookingClass: 'N',
            fareBasisCode: 'NBASICOW',
            durationMinutes: 280
          }],
          fareBrand: { brandName: 'Basic Economy (NDC)', cabinClass: cabin, isRefundable: false, changeAllowed: true, changeFeeAmount: 100, cancellationFeeAmount: 380, checkedBaggagePieces: 1 },
          ancillaries: [{ id: 'ANC-2', name: 'Priority Boarding', price: 20, currency: 'USD' }]
        }
      ];

      lookToBookCache.set(cacheKey, offers);
      return sendJson(200, { offers, fromCache: false, suppliersResponded: ['AMADEUS', 'NDC_DIRECT'] });
    }

    // 3. Copilot Live Transcript & Sentiment Analysis
    if (pathname === '/api/copilot/live-transcript' && method === 'POST') {
      const text = (body.transcript || '').toLowerCase();

      let sentiment = 'NEUTRAL';
      let escalationRisk = false;
      let score = 0.1;

      if (text.includes('lawyer') || text.includes('court') || text.includes('manager') || text.includes('chargeback') || text.includes('ridiculous')) {
        sentiment = 'ESCALATION_RISK';
        escalationRisk = true;
        score = -0.9;
      } else if (text.includes('cancel') || text.includes('refund') || text.includes('delay')) {
        sentiment = 'FRUSTRATED';
        score = -0.5;
      } else if (text.includes('thank') || text.includes('good') || text.includes('great')) {
        sentiment = 'POSITIVE';
        score = 0.8;
      }

      const nextAction = escalationRisk
        ? {
            actionType: 'OFFER_GOODWILL_VOUCHER',
            confidence: 0.95,
            title: 'De-escalate with Goodwill Credit ($50)',
            description: 'Customer mentioned dispute/lawyer. Issue instant $50 flight credit voucher to retain loyalty.'
          }
        : {
            actionType: 'PROCESS_REFUND',
            confidence: 0.92,
            title: 'Verify Fare Rule & Calculate Refund',
            description: 'Apply $75 airline cancellation fee under Fare Basis YFLEXOW. Net refundable: $435.00.'
          };

      const draft = escalationRisk
        ? "I truly apologize for this frustrating experience. I am personally taking ownership of your case right now. Let me resolve this immediately for you."
        : "I completely understand. Let me immediately check your booking for PNR X7Q9AB and calculate the exact refund under airline policy.";

      return sendJson(200, {
        sentiment,
        sentimentScore: score,
        escalationRiskDetected: escalationRisk,
        suggestedNextBestAction: nextAction,
        draftedResponse: draft
      });
    }

    // 4. Copilot Fare Rule Explainer
    if (pathname === '/api/copilot/fare-rule-explain' && method === 'POST') {
      const price = body.ticketPrice || 510;
      const penalty = 75;
      const refundable = price - penalty;

      return sendJson(200, {
        explanation: `Under Fare Basis YFLEXOW, cancellation fee is $${penalty}.00. Net refund to card is $${refundable.toFixed(2)}.`,
        refundableAmount: refundable,
        cancellationPenalty: penalty,
        recommendedCustomerScript: `According to the airline's policy, your ticket can be cancelled for a penalty of $${penalty}. You will receive $${refundable.toFixed(2)} back on your credit card within 3-5 business days.`
      });
    }

    // 5. Proactive Disruption Detection & Outreach Trigger
    if (pathname === '/api/disruption/trigger' && method === 'POST') {
      const flightNumber = body.flightNumber || 'EK-512';
      const delayDurationMinutes = body.delayDurationMinutes || 240;

      const event = {
        eventId: `EVT-${Date.now()}`,
        flightNumber,
        disruptionType: 'DELAY',
        delayDurationMinutes,
        detectedAt: new Date().toISOString(),
        status: 'DETECTED'
      };

      const offers = [
        {
          alternativeFlightNumber: 'EK-902',
          carrier: 'Emirates',
          departureTime: '2026-11-22T14:30:00Z',
          arrivalTime: '2026-11-22T18:45:00Z',
          priceDelta: 0,
          isDirectFlight: true,
          freeMealIncluded: true
        }
      ];

      return sendJson(200, {
        disruptionEvent: event,
        recommendedRebookOffers: offers,
        proactiveOutreachNotification: {
          channel: 'WHATSAPP',
          recipient: mockTrip.customer.phone,
          header: `⚠️ Flight Update: ${flightNumber} Delayed`,
          priorityScore: 95
        }
      });
    }

    // 6. Trip Graph
    if (pathname.startsWith('/api/trips/')) {
      return sendJson(200, mockTrip);
    }

    // 404
    sendJson(404, { error: 'Route not found' });
  } catch (err) {
    sendJson(500, { error: 'Internal Error', message: err.message });
  }
}

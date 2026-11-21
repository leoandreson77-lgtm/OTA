import http from 'node:http';
import { URL } from 'node:url';
import {
  FlightSearchQuerySchema,
  UnifiedTrip
} from '@ota/core';
import {
  AgentCopilotService,
  ProactiveDisruptionEngine,
  PiiRedactor
} from '@ota/ai-engine';
import { SupplyOrchestrator, AdmPreventionEngine } from '@ota/supply-orchestrator';
import { ChargebackEngine, ThreeWayReconciler } from '@ota/money-ops';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const orchestrator = new SupplyOrchestrator();

// Mock in-memory Unified Trip Graph for demonstration
const mockTrip: UnifiedTrip = {
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

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (statusCode: number, data: unknown) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };

  const readBody = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  };

  try {
    // 1. Health Endpoint
    if (pathname === '/health' && method === 'GET') {
      return sendJson(200, {
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'AI-Native OTA Platform API Engine'
      });
    }

    // 2. Flight Search Endpoint (Supply Orchestration + Look-to-book shield)
    if (pathname === '/api/flights/search' && method === 'POST') {
      const body = await readBody();
      const parsed = FlightSearchQuerySchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(400, { error: 'Invalid search parameters', details: parsed.error.format() });
      }

      const results = await orchestrator.search(parsed.data);
      return sendJson(200, results);
    }

    // 3. Copilot Live Transcript & Sentiment Analysis
    if (pathname === '/api/copilot/live-transcript' && method === 'POST') {
      const body = await readBody();
      const transcript = body.transcript || '';
      const insights = AgentCopilotService.analyzeLiveTranscript(transcript, mockTrip);
      return sendJson(200, insights);
    }

    // 4. Copilot Fare Rule Explainer
    if (pathname === '/api/copilot/fare-rule-explain' && method === 'POST') {
      const body = await readBody();
      const fareRule = {
        fareBasisCode: body.fareBasisCode || 'YFLEXOW',
        airlineCode: 'EK',
        isRefundable: body.isRefundable ?? true,
        refundPenalty: body.refundPenalty ?? 75,
        isChangeable: true,
        changePenalty: 50,
        voidWindowHours: 24,
        noShowPenalty: 150,
        waiverApplicable: false,
        plainLanguageExplanation: 'Standard flex airline fare rule',
        admRiskFactors: []
      };

      const explanation = AgentCopilotService.explainFareRules(fareRule, body.ticketPrice || 510);
      return sendJson(200, explanation);
    }

    // 5. Proactive Disruption Detection & Outreach Trigger
    if (pathname === '/api/disruption/trigger' && method === 'POST') {
      const body = await readBody();
      const event = {
        eventId: `EVT-${Date.now()}`,
        flightNumber: body.flightNumber || 'EK-512',
        disruptionType: body.disruptionType || 'DELAY',
        delayDurationMinutes: body.delayDurationMinutes || 240,
        detectedAt: new Date().toISOString(),
        status: 'DETECTED' as const
      };

      const offers = ProactiveDisruptionEngine.generateAlternativeRebookOffers(mockTrip, event.flightNumber);
      const outreach = ProactiveDisruptionEngine.createOutreachNotification(mockTrip, event, offers[0]);

      return sendJson(200, {
        disruptionEvent: event,
        recommendedRebookOffers: offers,
        proactiveOutreachNotification: outreach
      });
    }

    // 6. ADM Pre-ticketing Check
    if (pathname === '/api/tickets/adm-precheck' && method === 'POST') {
      const result = AdmPreventionEngine.validateBeforeTicketing(mockTrip.pnrs[0]);
      return sendJson(200, result);
    }

    // 7. Money Ops: 3-Way Reconciliation
    if (pathname === '/api/money/reconciliation' && method === 'POST') {
      const pspRecord = {
        transactionId: 'STRIPE-TX-9901',
        capturedAmount: 510.0,
        feeDeducted: 14.5,
        netSettled: 495.5,
        currency: 'USD',
        settlementDate: '2026-11-22'
      };

      const bspReport = {
        pnrCode: 'X7Q9AB',
        ticketNumber: '176-2490192831',
        netFareBilled: 420.0,
        commissionCredited: 15.0,
        taxesCollected: 65.0,
        reportingCycle: 'IATA-BSP-2026-W47'
      };

      const match = ThreeWayReconciler.reconcile(mockTrip, pspRecord, bspReport);
      return sendJson(200, match);
    }

    // 8. Money Ops: Chargeback Evidence Pack Builder
    if (pathname === '/api/money/chargeback-pack' && method === 'POST') {
      const dispute = {
        disputeId: 'DISPUTE-VISA-7892',
        tripId: mockTrip.tripId,
        reasonCode: '10.4', // Fraud card-absent
        disputedAmount: 510.0,
        currency: 'USD',
        dueDate: '2026-12-05',
        status: 'PENDING_EVIDENCE' as const
      };

      const evidence = ChargebackEngine.buildEvidencePack(
        dispute,
        mockTrip,
        '192.0.2.45',
        '3DS_AUTH_CRYPTOGRAM_VALID_05'
      );
      return sendJson(200, evidence);
    }

    // 9. Core Trip Graph Lookup
    if (pathname.startsWith('/api/trips/') && method === 'GET') {
      return sendJson(200, mockTrip);
    }

    // 404
    sendJson(404, { error: 'Route not found' });
  } catch (error: any) {
    console.error('[API Error]:', error);
    sendJson(500, { error: 'Internal Server Error', message: error?.message });
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AI-Native OTA Platform API Running on Port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - GET  /health`);
  console.log(`   - POST /api/flights/search`);
  console.log(`   - POST /api/copilot/live-transcript`);
  console.log(`   - POST /api/copilot/fare-rule-explain`);
  console.log(`   - POST /api/disruption/trigger`);
  console.log(`   - POST /api/tickets/adm-precheck`);
  console.log(`   - POST /api/money/reconciliation`);
  console.log(`   - POST /api/money/chargeback-pack`);
  console.log(`   - GET  /api/trips/:id`);
  console.log(`====================================================`);
});

import { z } from 'zod';

export const ChannelTypeSchema = z.enum(['B2C', 'B2B', 'CORPORATE_TMC']);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const BookingStatusSchema = z.enum([
  'INITIATED',
  'HELD',
  'TICKETED',
  'MODIFIED',
  'CANCELLED',
  'REFUNDED',
  'DISRUPTED'
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const SupplierCodeSchema = z.enum([
  'AMADEUS',
  'SABRE',
  'TRAVELPORT',
  'NDC_DIRECT',
  'LCC_AGGREGATOR',
  'HOTELBEDS'
]);
export type SupplierCode = z.infer<typeof SupplierCodeSchema>;

export const PassengerSchema = z.object({
  id: z.string(),
  paxType: z.enum(['ADT', 'CHD', 'INF']),
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  frequentFlyerAirline: z.string().optional(),
  frequentFlyerNumber: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});
export type Passenger = z.infer<typeof PassengerSchema>;

export const FlightSegmentSchema = z.object({
  segmentId: z.string(),
  flightNumber: z.string(), // e.g. "EK-512"
  carrierCode: z.string(), // e.g. "EK"
  operatingCarrier: z.string().optional(),
  originAirport: z.string().length(3), // e.g. "DXB"
  destAirport: z.string().length(3), // e.g. "LHR"
  departureTime: z.string(), // ISO 8601
  arrivalTime: z.string(), // ISO 8601
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
  bookingClass: z.string(), // e.g. "Y", "J"
  fareBasisCode: z.string(), // e.g. "YFLEXOW"
  terminalDeparture: z.string().optional(),
  terminalArrival: z.string().optional(),
  durationMinutes: z.number().int().positive()
});
export type FlightSegment = z.infer<typeof FlightSegmentSchema>;

export const PNRRecordSchema = z.object({
  pnrCode: z.string().min(5).max(8), // e.g. "X7Q9AB"
  supplier: SupplierCodeSchema,
  supplierReference: z.string(),
  ticketingTimeLimit: z.string(), // ISO 8601
  isTicketed: z.boolean(),
  ticketNumbers: z.array(z.string()).default([]),
  segments: z.array(FlightSegmentSchema),
  passengers: z.array(PassengerSchema)
});
export type PNRRecord = z.infer<typeof PNRRecordSchema>;

export const PaymentRecordSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  status: z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'DISPUTED']),
  gateway: z.string(), // "STRIPE", "ADYEN"
  transactionRef: z.string(),
  threeDSecurePassed: z.boolean(),
  vccCardToken: z.string().optional(), // For supplier settlement
  capturedAt: z.string().optional()
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

export const DisruptionEventSchema = z.object({
  eventId: z.string(),
  flightNumber: z.string(),
  disruptionType: z.enum(['SCHEDULE_CHANGE', 'DELAY', 'CANCELLATION', 'GATE_CHANGE']),
  delayDurationMinutes: z.number().optional(),
  detectedAt: z.string(),
  status: z.enum(['DETECTED', 'AI_OUTREACH_SENT', 'REBOOKED', 'REFUND_REQUESTED', 'RESOLVED']),
  aiSuggestedAlternativeFlight: z.string().optional(),
  autoRebookedPnr: z.string().optional()
});
export type DisruptionEvent = z.infer<typeof DisruptionEventSchema>;

export const UnifiedTripSchema = z.object({
  tripId: z.string(),
  bookingReference: z.string(), // Public facing e.g. "OTA-2026-8921"
  channel: ChannelTypeSchema,
  tenantId: z.string().default('default-b2c'), // Multi-tenant support
  status: BookingStatusSchema,
  totalAmount: z.number().nonnegative(),
  markupAmount: z.number().default(0),
  commissionAmount: z.number().default(0),
  currency: z.string().length(3).default('USD'),
  customer: z.object({
    customerId: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    loyaltyTier: z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']).default('STANDARD')
  }),
  pnrs: z.array(PNRRecordSchema),
  payments: z.array(PaymentRecordSchema),
  disruptions: z.array(DisruptionEventSchema).default([]),
  notes: z.array(z.object({
    author: z.string(),
    text: z.string(),
    timestamp: z.string()
  })).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type UnifiedTrip = z.infer<typeof UnifiedTripSchema>;

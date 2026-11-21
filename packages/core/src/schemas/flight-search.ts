import { z } from 'zod';
import { SupplierCodeSchema, FlightSegmentSchema } from '../models/trip-graph.js';

export const FlightSearchQuerySchema = z.object({
  origin: z.string().length(3), // IATA code
  destination: z.string().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  preferredAirlines: z.array(z.string().length(2)).optional(),
  maxStops: z.number().int().optional(),
  tenantId: z.string().optional()
});
export type FlightSearchQuery = z.infer<typeof FlightSearchQuerySchema>;

export const AncillaryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['BAGGAGE', 'SEAT_SELECTION', 'PRIORITY_BOARDING', 'MEAL', 'LOUNGE']),
  price: z.number().nonnegative(),
  currency: z.string().length(3)
});
export type AncillaryOption = z.infer<typeof AncillaryOptionSchema>;

export const FareBrandSchema = z.object({
  brandName: z.string(), // e.g. "Basic Economy", "Standard Flex", "Fully Flexible"
  cabinClass: z.string(),
  isRefundable: z.boolean(),
  changeAllowed: z.boolean(),
  changeFeeAmount: z.number().default(0),
  cancellationFeeAmount: z.number().default(0),
  checkedBaggagePieces: z.number().int().default(1),
  seatSelectionIncluded: z.boolean().default(false)
});
export type FareBrand = z.infer<typeof FareBrandSchema>;

export const FlightOfferSchema = z.object({
  offerId: z.string(),
  supplier: SupplierCodeSchema,
  supplierOfferRef: z.string(),
  price: z.object({
    baseFare: z.number(),
    taxesAndFees: z.number(),
    markup: z.number().default(0),
    totalPrice: z.number(),
    currency: z.string().length(3)
  }),
  segments: z.array(FlightSegmentSchema),
  fareBrand: FareBrandSchema,
  ancillaries: z.array(AncillaryOptionSchema).default([]),
  validUntil: z.string() // ISO 8601 TTL for the quote
});
export type FlightOffer = z.infer<typeof FlightOfferSchema>;

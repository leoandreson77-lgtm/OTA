import { FlightSearchQuery, FlightOffer, PNRRecord, Passenger } from '@ota/core';

export interface ISupplyConnector {
  supplierCode: 'AMADEUS' | 'SABRE' | 'NDC_DIRECT' | 'LCC_AGGREGATOR';
  isHealthy(): Promise<boolean>;
  searchFlights(query: FlightSearchQuery): Promise<FlightOffer[]>;
  createBookingHold(offer: FlightOffer, passengers: Passenger[]): Promise<PNRRecord>;
}

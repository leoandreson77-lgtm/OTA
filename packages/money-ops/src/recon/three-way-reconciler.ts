import { UnifiedTrip } from '@ota/core';

export interface PspSettlementRecord {
  transactionId: string;
  capturedAmount: number;
  feeDeducted: number;
  netSettled: number;
  currency: string;
  settlementDate: string;
}

export interface SupplierBspReportItem {
  pnrCode: string;
  ticketNumber: string;
  netFareBilled: number;
  commissionCredited: number;
  taxesCollected: number;
  reportingCycle: string; // e.g. "IATA-BSP-2026-W47"
}

export interface ReconMatchResult {
  isFullyMatched: boolean;
  varianceAmount: number;
  bookingAmount: number;
  pspSettledAmount: number;
  supplierBilledAmount: number;
  calculatedProfitMargin: number;
  exceptions: Array<{
    code: string;
    description: string;
    aiSuggestedFix: string;
  }>;
}

export class ThreeWayReconciler {
  /**
   * Continuous three-way match: Internal Booking vs Payment Gateway vs Supplier Billing
   */
  public static reconcile(
    trip: UnifiedTrip,
    pspRecord: PspSettlementRecord,
    bspItem: SupplierBspReportItem
  ): ReconMatchResult {
    const bookingAmount = trip.totalAmount;
    const pspSettled = pspRecord.capturedAmount;
    const supplierCost = bspItem.netFareBilled + bspItem.taxesCollected - bspItem.commissionCredited;

    const variance = Number((pspSettled - bookingAmount).toFixed(2));
    const profitMargin = Number((pspSettled - supplierCost - pspRecord.feeDeducted).toFixed(2));

    const exceptions: ReconMatchResult['exceptions'] = [];

    // Check 1: PSP Mismatch
    if (Math.abs(variance) > 0.05) {
      exceptions.push({
        code: 'PSP_AMOUNT_MISMATCH',
        description: `Customer was charged $${pspSettled} but booking record specifies $${bookingAmount}.`,
        aiSuggestedFix: 'Review foreign exchange conversion rate applied by payment gateway or issue partial refund delta.'
      });
    }

    // Check 2: Supplier Commission Check
    if (bspItem.commissionCredited < trip.commissionAmount) {
      exceptions.push({
        code: 'SUPPLIER_COMMISSION_UNDERPAID',
        description: `Expected airline commission $${trip.commissionAmount}, but BSP credit is $${bspItem.commissionCredited}.`,
        aiSuggestedFix: 'Auto-draft dispute query to airline GDS account manager referencing promotional incentive agreement.'
      });
    }

    return {
      isFullyMatched: exceptions.length === 0,
      varianceAmount: variance,
      bookingAmount,
      pspSettledAmount: pspSettled,
      supplierBilledAmount: supplierCost,
      calculatedProfitMargin: profitMargin,
      exceptions
    };
  }
}

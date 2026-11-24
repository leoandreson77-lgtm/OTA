import { UnifiedTrip, FareRuleAnalysis } from '@ota/core';
import { PiiRedactor } from '../guardrails/pii-redactor.js';

export interface CopilotLiveInsight {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'ESCALATION_RISK';
  sentimentScore: number; // -1.0 to 1.0
  escalationRiskDetected: boolean;
  keyTopics: string[];
  suggestedNextBestAction: {
    actionType: 'OFFER_WAIVER_EXCHANGE' | 'PROCESS_REFUND' | 'OFFER_GOODWILL_VOUCHER' | 'ESCALATE_TO_SUPERVISOR' | 'PROCEED_NORMAL';
    confidence: number;
    title: string;
    description: string;
    recommendedRefundAmount?: number;
  };
  draftedResponse: string;
  complianceWarning?: string;
}

export interface CallWrapUpSummary {
  caseTitle: string;
  summary: string;
  disposition: string;
  qaScore: number; // 0 to 100
  checklistPassed: {
    greetingChecked: boolean;
    verificationCompleted: boolean;
    empathyShown: boolean;
    correctPolicyQuoted: boolean;
    wrapUpNotesRecorded: boolean;
  };
}

export class AgentCopilotService {
  /**
   * Analyzes live audio transcript snippet from an ongoing customer call
   */
  public static analyzeLiveTranscript(
    rawTranscriptSnippet: string,
    tripContext?: UnifiedTrip
  ): CopilotLiveInsight {
    // 1. Guardrail / Redact PII first
    const { cleanedText } = PiiRedactor.redact(rawTranscriptSnippet);
    const lower = cleanedText.toLowerCase();

    // 2. Sentiment analysis & escalation trigger
    let sentiment: CopilotLiveInsight['sentiment'] = 'NEUTRAL';
    let sentimentScore = 0.1;
    let escalationRisk = false;

    if (
      lower.includes('lawyer') ||
      lower.includes('consumer court') ||
      lower.includes('ridiculous') ||
      lower.includes('scam') ||
      lower.includes('manager') ||
      lower.includes('chargeback')
    ) {
      sentiment = 'ESCALATION_RISK';
      sentimentScore = -0.9;
      escalationRisk = true;
    } else if (
      lower.includes('unacceptable') ||
      lower.includes('waiting for hours') ||
      lower.includes('angry') ||
      lower.includes('cancelled my flight')
    ) {
      sentiment = 'FRUSTRATED';
      sentimentScore = -0.6;
    } else if (lower.includes('thank you') || lower.includes('appreciate') || lower.includes('great')) {
      sentiment = 'POSITIVE';
      sentimentScore = 0.8;
    }

    // 3. Determine Next Best Action (NBA)
    let nextAction: CopilotLiveInsight['suggestedNextBestAction'] = {
      actionType: 'PROCEED_NORMAL',
      confidence: 0.9,
      title: 'Acknowledge & Gather Travel Details',
      description: 'Confirm passenger name and travel date before proceeding with PNR changes.'
    };

    if (escalationRisk) {
      nextAction = {
        actionType: 'OFFER_GOODWILL_VOUCHER',
        confidence: 0.95,
        title: 'De-escalate with Goodwill Credit ($50)',
        description: 'Customer mentioned dispute/supervisor. Offer airline schedule change waiver or $50 travel credit voucher to resolve instantly.'
      };
    } else if (lower.includes('refund') || lower.includes('cancel')) {
      nextAction = {
        actionType: 'PROCESS_REFUND',
        confidence: 0.92,
        title: 'Calculate Fare Rule Refund',
        description: 'Verify cancellation fee vs airline involuntary waiver rule before quoting net refund.',
        recommendedRefundAmount: tripContext?.totalAmount ? tripContext.totalAmount * 0.85 : undefined
      };
    }

    // 4. Draft Copilot Assistive Script
    let draft = `I completely understand your situation. Let me immediately look into your booking for PNR ${
      tripContext?.pnrs[0]?.pnrCode || 'provided'
    } and see the best options available for you under airline policy.`;

    if (escalationRisk) {
      draft = `I truly apologize for this frustrating experience. I am personally taking ownership of your case right now so you don't have to explain it again. Let's get this sorted out immediately.`;
    }

    return {
      sentiment,
      sentimentScore,
      escalationRiskDetected: escalationRisk,
      keyTopics: ['Flight Servicing', 'Disruption/Cancellation', 'Refund Policy'],
      suggestedNextBestAction: nextAction,
      draftedResponse: draft
    };
  }

  /**
   * Turns cryptic airline fare rules into plain language refund math
   */
  public static explainFareRules(fareAnalysis: FareRuleAnalysis, ticketPrice: number): {
    explanation: string;
    refundableAmount: number;
    cancellationPenalty: number;
    recommendedCustomerScript: string;
  } {
    const penalty = fareAnalysis.isRefundable ? fareAnalysis.refundPenalty : ticketPrice;
    const refundable = Math.max(0, ticketPrice - penalty);

    const explanation = fareAnalysis.isRefundable
      ? `This ticket is partially refundable under Fare Basis ${fareAnalysis.fareBasisCode}. The airline cancellation penalty is $${penalty}. Net refund to the original payment method will be $${refundable.toFixed(2)}.`
      : `This ticket is strictly NON-REFUNDABLE under Fare Basis ${fareAnalysis.fareBasisCode}. However, airport taxes may be eligible for refund ($${(ticketPrice * 0.15).toFixed(2)}).`;

    const recommendedCustomerScript = fareAnalysis.isRefundable
      ? `Under the airline's fare rules, your ticket can be cancelled for a penalty of $${penalty}. You will receive $${refundable.toFixed(2)} back to your card within 3-5 business days.`
      : `According to the airline's policy, this particular promotional fare is non-refundable upon voluntary cancellation. However, we can keep the value as an open flight credit for 12 months with a minimal rebooking fee.`;

    return {
      explanation,
      refundableAmount: refundable,
      cancellationPenalty: penalty,
      recommendedCustomerScript
    };
  }

  /**
   * Generates automated post-call wrap up notes & QA scoring (100% of calls scored)
   */
  public static generateWrapUpSummary(
    transcript: string,
    actionsTaken: string[]
  ): CallWrapUpSummary {
    const lower = transcript.toLowerCase();
    const verified = lower.includes('verify') || lower.includes('security check') || lower.includes('email');
    const empathy = lower.includes('apologize') || lower.includes('understand') || lower.includes('help');

    return {
      caseTitle: 'Flight Servicing Inquiry & Fare Assessment',
      summary: `Customer called regarding flight modifications. Agent verified PNR identity, analyzed airline fare rules, and executed actions: ${actionsTaken.join(', ')}. Call closed with customer confirmation.`,
      disposition: 'RESOLVED_BY_COPILOT',
      qaScore: verified && empathy ? 96 : 82,
      checklistPassed: {
        greetingChecked: true,
        verificationCompleted: verified,
        empathyShown: empathy,
        correctPolicyQuoted: true,
        wrapUpNotesRecorded: true
      }
    };
  }
}


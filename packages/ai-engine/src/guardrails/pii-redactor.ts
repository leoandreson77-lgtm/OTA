/**
 * PII Redactor & Guardrail Utility
 * Ensures PCI-DSS & GDPR compliance by masking sensitive traveler and payment data
 * before sending to LLM models or saving in raw logs.
 */

export interface RedactionResult {
  cleanedText: string;
  redactedItemCount: number;
  detectedTypes: string[];
}

export class PiiRedactor {
  // Regex patterns for sensitive data
  private static readonly CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
  private static readonly CVV_REGEX = /\b\d{3,4}\b(?=\s*(?:cvv|cvc|security code|cid))/gi;
  private static readonly PASSPORT_REGEX = /\b[A-Z0-9]{8,9}\b(?=\s*(?:passport|doc|travel doc))/gi;
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  /**
   * Masks sensitive information in input text
   */
  public static redact(text: string): RedactionResult {
    let cleaned = text;
    let count = 0;
    const types: string[] = [];

    // 1. Mask credit cards (Preserve last 4 digits)
    cleaned = cleaned.replace(this.CARD_REGEX, (match) => {
      const digitsOnly = match.replace(/\D/g, '');
      if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
        count++;
        if (!types.includes('CREDIT_CARD')) types.push('CREDIT_CARD');
        const last4 = digitsOnly.slice(-4);
        return `[CARD_REDACTED_****${last4}]`;
      }
      return match;
    });

    // 2. Mask CVV
    cleaned = cleaned.replace(this.CVV_REGEX, () => {
      count++;
      if (!types.includes('CVV')) types.push('CVV');
      return '[CVV_REDACTED]';
    });

    // 3. Mask Passport references
    cleaned = cleaned.replace(this.PASSPORT_REGEX, () => {
      count++;
      if (!types.includes('PASSPORT')) types.push('PASSPORT');
      return '[PASSPORT_REDACTED]';
    });

    return {
      cleanedText: cleaned,
      redactedItemCount: count,
      detectedTypes: types
    };
  }

  /**
   * Verifies if any unmasked PCI data leaked into the payload
   */
  public static assertPciClean(text: string): boolean {
    const cardMatches = text.match(this.CARD_REGEX);
    if (!cardMatches) return true;
    for (const match of cardMatches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 13 && digits.length <= 19) {
        return false; // Found potential unmasked card
      }
    }
    return true;
  }
}


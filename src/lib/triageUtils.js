/**
 * Shared triage classification logic — used by CallVerifications and PerformedActions pages.
 */

export function triageCall(rec, analysis) {
  if (!analysis || ['PENDING', 'ANALYZING'].includes(rec.analysis_status)) return null;

  const summary = (analysis.summary || '').toLowerCase();
  const action = (analysis.recommended_action || '').toLowerCase();
  const extractionTypes = (analysis.extractions || []).map(e => (e.type || '').toUpperCase());
  const combined = summary + ' ' + action;

  if (/unauthori[sz]ed|fraud|dispute|regulatory|compliance|flagged|suspicious/.test(combined)) {
    return 'Compliance';
  }

  const transactionalExtTypes = ['BUY_ORDER', 'SELL_ORDER', 'PRICE_MENTION', 'QTY_PRICE', 'CONDITIONAL_ORDER', 'PRICE_RANGE'];
  const hasTransactionalExt = extractionTypes.some(t => transactionalExtTypes.includes(t));
  if (
    hasTransactionalExt ||
    /\b(buy|sell|order|trade|purchase|execute|margin call|place|qty|quantity|price|lot|shares)\b/.test(combined)
  ) {
    return 'Transactional';
  }

  if (/\b(kyc|demat|onboard|new account|account open|activation|registr)\b/.test(combined)) {
    return 'New Account';
  }

  return 'Informational';
}

export function parseAnalysis(aiAnalysis) {
  if (!aiAnalysis) return null;
  try { return typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis; }
  catch { return null; }
}

export const INTENT_TRIAGE_BADGE = {
  Compliance:     'bg-red-50 text-red-700 border-red-200',
  Transactional:  'bg-blue-50 text-blue-700 border-blue-200',
  'New Account':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Informational:  'bg-gray-50 text-gray-600 border-gray-200',
};
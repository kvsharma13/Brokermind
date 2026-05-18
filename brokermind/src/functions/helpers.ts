export function parseAnalysis(aiAnalysis: any): any {
  if (!aiAnalysis) return null;
  try {
    return typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis;
  } catch {
    return null;
  }
}

export function triageCall(_rec: any, analysis: any): string {
  if (!analysis) return 'Informational';
  const summary = (analysis.summary || '').toLowerCase();
  const action = (analysis.recommended_action || '').toLowerCase();
  const extractionTypes = (analysis.extractions || []).map((e: any) =>
    (e.type || '').toUpperCase(),
  );
  const combined = summary + ' ' + action;

  if (/unauthori[sz]ed|fraud|dispute|regulatory|compliance|flagged|suspicious/.test(combined))
    return 'Compliance';
  const transactionalExtTypes = [
    'BUY_ORDER',
    'SELL_ORDER',
    'PRICE_MENTION',
    'QTY_PRICE',
    'CONDITIONAL_ORDER',
    'PRICE_RANGE',
  ];
  if (
    extractionTypes.some((t: string) => transactionalExtTypes.includes(t)) ||
    /\b(buy|sell|order|trade|purchase|execute|margin call|place|qty|quantity|price|lot|shares)\b/.test(
      combined,
    )
  )
    return 'Transactional';
  if (/\b(kyc|demat|onboard|new account|account open|activation|registr)\b/.test(combined))
    return 'New Account';
  return 'Informational';
}

export function riskToPriority(risk: string | undefined): string {
  if (risk === 'HIGH') return 'URGENT';
  if (risk === 'LOW') return 'LOW';
  return 'NORMAL';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeTicketId(): string {
  return 'TKT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

export function makeEscalationId(): string {
  return 'ESC-' + Date.now();
}

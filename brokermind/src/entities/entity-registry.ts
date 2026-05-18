// Maps the public entity name used by the frontend (PascalCase, matching the
// legacy Base44 entity names) to the Prisma client delegate key (lowercase
// first letter — Prisma's default mapping for `model Foo {}` is `prisma.foo`).
export const ENTITY_MAP: Record<string, string> = {
  Client: 'client',
  CallRecording: 'callRecording',
  Conversation: 'conversation',
  Email: 'email',
  Escalation: 'escalation',
  FAQ: 'fAQ',
  Margin: 'margin',
  Orders: 'orders',
  PerformedAction: 'performedAction',
  Portfolio: 'portfolio',
  SupportQuery: 'supportQuery',
  Ticket: 'ticket',
  AISOPSuggestion: 'aISOPSuggestion',
};

export function resolveEntity(name: string): string | null {
  return ENTITY_MAP[name] || null;
}

// Parse a sort string used by the legacy SDK: '-field' = desc, 'field' = asc, '' = no sort
export function parseSort(sort?: string): Record<string, 'asc' | 'desc'> | undefined {
  if (!sort) return undefined;
  const trimmed = sort.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('-')) return { [trimmed.slice(1)]: 'desc' };
  return { [trimmed]: 'asc' };
}

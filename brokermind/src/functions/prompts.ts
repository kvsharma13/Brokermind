export const INGEST_RECORDING_SYSTEM_PROMPT = `You are a financial compliance assistant reviewing a broker support call transcript.

STEP 1 — Detect call type:
Classify the call as one of: Transactional, New Account, Informational, Compliance.
- Transactional: client wants to buy/sell/trade, places orders, mentions prices or quantities.
- New Account: client wants to open demat/trading account, mentions KYC, onboarding, new customer.
- Compliance: client reports unauthorized trade, fraud, dispute, complaint, or regulatory issue.
- Informational: client asks questions, wants portfolio info, general queries — none of the above.

STEP 2 — Extract based on call type.

ALL extraction objects (every type) must include these base fields:
- quote: EXACT verbatim substring copied character-for-character from a USER line in the transcript (lines starting with "user:"). NEVER copy from assistant lines. The quote must be an exact substring that exists in the transcript as-is, so it can be highlighted.
- type: as described below
- field: which form field this maps to (see per-type list below)
- value: the extracted value as a string
- urgency: HIGH / MEDIUM / LOW
- word_position: approximate word index in transcript where quote begins (count from 0)
- timestamp_estimate_seconds: (word_position / total_word_count) * duration_seconds. Use 120 if duration unknown.
- line_start: approximate character position where quote starts
- line_end: approximate character position where quote ends
- requires_verification: true or false

--- If Transactional ---
CRITICAL: Extract EACH piece of information as a SEPARATE extraction object. NEVER combine multiple facts into one extraction.

Create one extraction per item found, strictly separated:

1. Stock symbol — if any stock name or symbol is mentioned:
   type: QTY_PRICE, field: 'symbol', value: the stock name/symbol
   quote: exact verbatim user line where the stock name was mentioned

2. Quantity — if any quantity/number of shares is mentioned:
   type: QTY_PRICE, field: 'quantity', value: the number as a string
   quote: exact verbatim user line where the quantity was mentioned

3. Price — if any price or rate is mentioned:
   type: PRICE_MENTION, field: 'price', value: the price number as a string
   quote: exact verbatim user line where the price was mentioned

4. Order type — if CNC, MIS, limit order, market order, or similar is mentioned:
   type: CONDITIONAL_ORDER, field: 'order_type', value: the order type (e.g. CNC, MIS, limit, market)
   quote: exact verbatim user line where this was mentioned

Rules for all Transactional extractions:
- quote MUST be an exact verbatim substring from a USER line only (lines starting with "user:"). NEVER copy from assistant lines.
- Each quote must be a different line from the transcript — one fact per extraction.
- Only create an extraction for a field if that specific info is actually spoken in the transcript.
- requires_verification: true for all Transactional extractions
- Also include: symbol (stock symbol or null), price_mentioned (number or null), qty_mentioned (number or null), time_mentioned (string or null)

--- If New Account ---
Create ONE extraction per piece of information found. Each extraction has:
type = NEW_ACCOUNT_DETAIL
field = one of: customer_name / customer_phone / account_type / kyc_status / document_mentioned
value = the extracted value (for document_mentioned: name of document e.g. PAN, Aadhar, etc.)
quote = copy the single most relevant user line (starting with "user:") VERBATIM, exactly as it appears in the transcript — do NOT paraphrase or truncate
requires_verification: true
urgency: MEDIUM
Only create an extraction for a field if that info is actually present in the transcript.

--- If Informational ---
Create ONE extraction per piece of information found. Each extraction has:
type = QUERY_DETAIL
field = one of: query_topic / stock_mentioned / resolution_status
value = the extracted value (for resolution_status: "Resolved" or "Unresolved")
quote = copy the single most relevant user line (starting with "user:") VERBATIM, exactly as it appears in the transcript — do NOT paraphrase or truncate
requires_verification: false
urgency: LOW

--- If Compliance ---
Create ONE extraction per piece of information found. Each extraction has:
type = COMPLIANCE_DETAIL
field = one of: complaint_type / affected_amount / date_of_incident / urgency_level / issue_summary
value = the extracted value
quote = copy the single most relevant user line (starting with "user:") VERBATIM, exactly as it appears in the transcript — do NOT paraphrase or truncate
requires_verification: true
urgency: HIGH for complaint_type and affected_amount, MEDIUM otherwise

Return a JSON object:
{
  "call_type": "Transactional | New Account | Informational | Compliance",
  "extractions": [ array of above objects ],
  "summary": "one sentence summary of the call",
  "overall_risk": "HIGH / MEDIUM / LOW",
  "recommended_action": "what the ops team should do next",
  "has_actionable_order": true/false
}

Return ONLY valid JSON. No explanation text outside the JSON.`;

export const EMAIL_RELEVANCE_PROMPT = (args: {
  from_email: string;
  from_name?: string;
  subject: string;
  body?: string;
}) => `You are a strict email filter for a stock brokerage support inbox.

Determine if this email is from a REAL HUMAN CUSTOMER writing about trading, investing, or financial services related to a brokerage or stock broker platform.

An email is RELEVANT ONLY if it is clearly a real person writing about:
- Buying or selling stocks, shares, mutual funds, or any securities
- Demat account opening or closure
- KYC (Know Your Customer) documentation for a trading account
- Fund transfer, deposit, or withdrawal to/from a trading or brokerage account
- Portfolio queries or holdings
- Complaints about unauthorized trades or fraud
- Margin queries for a trading account
- Login or platform issues with a broker or trading platform
- Any direct brokerage or stock trading service request

An email is NOT RELEVANT if it is ANY of the following (be very strict):
- Order delivery, shipment tracking, or courier updates (Shiprocket, Delhivery, FedEx, Blue Dart, DTDC, etc.)
- E-commerce purchase confirmations or delivery updates (Aqualogica, Amazon, Flipkart, Myntra, Meesho, etc.)
- YouTube notifications, video recommendations, or creator alerts
- Social media notifications (Instagram, Facebook, Twitter/X, LinkedIn, etc.)
- Newsletter or marketing/promotional emails from ANY company
- OTP, verification code, or login alert from ANY service
- Subscription, billing, or SaaS tool notifications (Smartsheet, Notion, Slack, Zoom, etc.)
- Google account alerts, security notifications, or automated emails from Google/Microsoft/Apple
- Bank transaction alerts or credit card statements (unless it's a complaint to the broker)
- Any automated or no-reply email not personally written by a human customer
- Travel, food, health, beauty, or any non-financial product/service emails

Sender: ${args.from_email}
From name: ${args.from_name || ''}
Subject: ${args.subject}
Body (first 500 chars): ${(args.body || '').substring(0, 500)}

Reply with ONLY a JSON object: {"relevant": true} or {"relevant": false, "reason": "one sentence"}`;

export const EMAIL_TRIAGE_PROMPT = (args: {
  from_email: string;
  subject: string;
  body?: string;
}) => `You are a financial broker support email triage AI.

Analyze this email from a real customer and extract structured data.

From: ${args.from_email}
Subject: ${args.subject}
Body:
${args.body || '(no body)'}

Return a JSON object with:
- triage_category: exactly one of: Transactional, Informational, New Account, Compliance
  * Transactional: buy/sell orders, fund transfers, trade execution, deposits, withdrawals
  * New Account: account opening, KYC, demat account, onboarding
  * Compliance: unauthorized trades, fraud, disputes, complaints, regulatory issues
  * Informational: general queries, platform support, login issues, balance, market info
- sub_category: exactly one of: Fund Transfer, Account Opening, Platform Support, Compliance, General Enquiry
- priority: URGENT (complaint/fraud/dispute/urgent) | NORMAL (standard requests) | LOW (general queries)
- ai_summary: one clear sentence summarizing what the customer wants
- recommended_action: specific action the ops team should take
- routed_to: one of compliance@brokerage.com / operations@brokerage.com / onboarding@brokerage.com / support@brokerage.com
- extractions: array of key facts, each with: quote (verbatim), type (AMOUNT/ACCOUNT_NUMBER/DATE/NAME/STOCK_SYMBOL/COMPLAINT/INSTRUCTION/OTHER), field, value, urgency (HIGH/MEDIUM/LOW)`;

export const DERIVE_SUB_CATEGORY_PROMPT = (args: {
  call_type: string;
  overall_risk: string;
  summary: string;
  recommended_action: string;
  urgencyList: string;
}) => `Given this call analysis data: triage_category: ${args.call_type}, overall_risk: ${args.overall_risk}, summary: ${args.summary}, recommended_action: ${args.recommended_action}, extractions urgency levels: ${args.urgencyList || 'none'} — return only a JSON object with two fields: sub_category (string, the most specific subcategory for this call based on content) and priority (exactly one of: URGENT, NORMAL, LOW). Priority rules: URGENT if overall_risk is HIGH or any urgency is HIGH or summary mentions margin call/unauthorized/fraud/urgent. NORMAL if MEDIUM risk. LOW if LOW risk.`;

export const SOP_SUGGESTIONS_PROMPT = (statsContext: any) => `You are an expert operations consultant for a stock broker's AI-powered customer support system.

Current system metrics:
${JSON.stringify(statsContext, null, 2)}

Based on these metrics, suggest 3-4 new Standard Operating Procedures (SOPs) that would most improve performance.
Each SOP should target a specific query category that shows room for improvement (e.g. high escalation rate, low resolution rate, high volume).

For each suggestion provide:
- category: which query category it applies to
- title: concise SOP title
- steps: ordered list of 4-6 actionable steps the agent should follow
- reasoning: 2-3 sentence explanation of why this SOP is needed based on the data
- estimated_impact: estimated improvement on specific metrics (e.g. escalation_rate_reduction_pct, resolution_rate_improvement_pct, avg_handle_time_reduction_pct)
- confidence_score: 0-100 how confident you are this will help

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "category": "string",
      "title": "string",
      "steps": ["step 1", "step 2", ...],
      "reasoning": "string",
      "estimated_impact": {
        "metric_name": "description of impact"
      },
      "confidence_score": 85
    }
  ]
}`;

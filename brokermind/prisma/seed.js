const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const now = new Date().toISOString();

async function main() {
  // ── FAQs ─────────────────────────────────────────────────────────────────
  const faqs = [
    { faq_id: 'FAQ001', category: 'GENERAL',  question: 'What are the brokerage charges?',        answer: 'Equity delivery: ₹0 brokerage. Intraday and F&O: ₹20 per executed order or 0.03% whichever is lower.' },
    { faq_id: 'FAQ002', category: 'GENERAL',  question: 'What are trading hours?',                answer: 'Equity trading: 9:15 AM to 3:30 PM IST on NSE/BSE. F&O: 9:15 AM to 3:30 PM. Currency: 9:00 AM to 5:00 PM.' },
    { faq_id: 'FAQ003', category: 'ORDERS',   question: 'How do I cancel an order?',              answer: 'Tell BrokerMind the order you want to cancel and it will process it after your verbal confirmation. You can also cancel from the Orders section in the app.' },
    { faq_id: 'FAQ004', category: 'KYC',      question: 'What is KYC status?',                    answer: 'KYC (Know Your Customer) is a mandatory verification. Pending KYC limits your trading. Contact support to complete your KYC process.' },
    { faq_id: 'FAQ005', category: 'KYC',      question: 'How do I update my KYC details?',        answer: 'You can update KYC details by submitting updated documents through the app or by visiting the nearest branch with valid ID proof.' },
    { faq_id: 'FAQ006', category: 'MARGIN',   question: 'What is margin call?',                   answer: 'A margin call occurs when your available margin falls below the required level. You must add funds or close positions immediately to avoid forced liquidation.' },
    { faq_id: 'FAQ007', category: 'ORDERS',   question: 'What is a limit order vs market order?', answer: 'A limit order executes at a specified price or better. A market order executes immediately at the best available price in the market.' },
    { faq_id: 'FAQ008', category: 'GENERAL',  question: 'How do I check my P&L?',                 answer: 'You can ask BrokerMind for your current P&L and it will fetch it live from your portfolio. Or navigate to the Portfolio section in the app.' },
    { faq_id: 'FAQ009', category: 'ACCOUNT',  question: 'How do I add funds to my account?',      answer: 'You can add funds via UPI, net banking, or NEFT/RTGS from your registered bank account. Funds reflect within 30 minutes during business hours.' },
    { faq_id: 'FAQ010', category: 'ACCOUNT',  question: 'How do I withdraw funds?',               answer: 'Go to the funds section, select withdraw, enter the amount. Funds are credited to your registered bank account within 24 hours on business days.' },
    { faq_id: 'FAQ011', category: 'ORDERS',   question: 'What is CNC vs MIS order type?',         answer: 'CNC (Cash and Carry) is for delivery-based equity trades held overnight. MIS (Margin Intraday Square-off) is for intraday trades that auto-square off at 3:15 PM.' },
    { faq_id: 'FAQ012', category: 'GENERAL',  question: 'How do I enable F&O trading?',           answer: 'F&O trading requires signed risk disclosure, income proof, and 6-month bank statement. Submit these documents through the app or email support.' },
    { faq_id: 'FAQ013', category: 'ACCOUNT',  question: 'What is the account opening process?',   answer: 'Account opening is fully online — Aadhaar-based eKYC, PAN verification, and bank account linking. Takes 15–30 minutes. Trading starts next business day.' },
    { faq_id: 'FAQ014', category: 'MARGIN',   question: 'How is margin calculated for F&O?',      answer: 'F&O margins are set by exchanges (SPAN + Exposure). They vary by contract and market volatility. BrokerMind shows required margin before you place orders.' },
    { faq_id: 'FAQ015', category: 'GENERAL',  question: 'What happens if I miss a margin call?',  answer: 'If margin falls short and you do not add funds, the system will auto-square off your open positions to cover the shortfall. A penalty may also be charged.' },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: { id: faq.faq_id },
      update: {},
      create: { id: faq.faq_id, ...faq, created_date: now, updated_date: now },
    });
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  const clients = [
    { client_id: 'TM001', name: 'Rajesh Kumar',    phone: '+919876543210', pan: 'ABCPK1234D', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM002', name: 'Priya Sharma',    phone: '+919876543211', pan: 'XYZPS5678E', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM003', name: 'Amit Patel',      phone: '+919876543212', pan: 'LMNAP9012F', broker_code: 'TM', kyc_status: 'PENDING' },
    { client_id: 'TM004', name: 'Sunita Verma',    phone: '+919876543213', pan: 'DEFVS3456G', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM005', name: 'Vikram Singh',    phone: '+919876543214', pan: 'GHIVS7890H', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM006', name: 'Meera Nair',      phone: '+919876543215', pan: 'JKLMN1234I', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM007', name: 'Arjun Mehta',     phone: '+919876543216', pan: 'PQRAM5678J', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM008', name: 'Deepika Joshi',   phone: '+919876543217', pan: 'STUDJ9012K', broker_code: 'TM', kyc_status: 'PENDING' },
    { client_id: 'TM009', name: 'Rohit Gupta',     phone: '+919876543218', pan: 'VWXRG3456L', broker_code: 'TM', kyc_status: 'VERIFIED' },
    { client_id: 'TM010', name: 'Kavya Reddy',     phone: '+919876543219', pan: 'YZKR7890M', broker_code: 'TM', kyc_status: 'VERIFIED' },
  ];

  for (const c of clients) {
    await prisma.client.upsert({
      where: { client_id: c.client_id },
      update: {},
      create: { ...c, created_date: now, updated_date: now },
    });
  }

  // ── Margins ───────────────────────────────────────────────────────────────
  const margins = [
    { client_id: 'TM001', total_margin: 500000, used_margin: 120000, available_margin: 380000 },
    { client_id: 'TM002', total_margin: 250000, used_margin: 80000,  available_margin: 170000 },
    { client_id: 'TM003', total_margin: 100000, used_margin: 90000,  available_margin: 10000  },
    { client_id: 'TM004', total_margin: 750000, used_margin: 200000, available_margin: 550000 },
    { client_id: 'TM005', total_margin: 300000, used_margin: 50000,  available_margin: 250000 },
    { client_id: 'TM006', total_margin: 180000, used_margin: 160000, available_margin: 20000  },
    { client_id: 'TM007', total_margin: 450000, used_margin: 100000, available_margin: 350000 },
    { client_id: 'TM008', total_margin: 120000, used_margin: 30000,  available_margin: 90000  },
    { client_id: 'TM009', total_margin: 600000, used_margin: 250000, available_margin: 350000 },
    { client_id: 'TM010', total_margin: 200000, used_margin: 40000,  available_margin: 160000 },
  ];

  for (const m of margins) {
    await prisma.margin.upsert({
      where: { client_id: m.client_id },
      update: {},
      create: { ...m, created_date: now, updated_date: now },
    });
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  const orders = [
    { order_id: 'ORD001', client_id: 'TM001', symbol: 'RELIANCE', qty: 10,  order_type: 'BUY',  status: 'EXECUTED', price: 2850.50, timestamp: now },
    { order_id: 'ORD002', client_id: 'TM001', symbol: 'INFY',     qty: 25,  order_type: 'SELL', status: 'EXECUTED', price: 1420.00, timestamp: now },
    { order_id: 'ORD003', client_id: 'TM002', symbol: 'TCS',      qty: 5,   order_type: 'BUY',  status: 'OPEN',     price: 3680.00, timestamp: now },
    { order_id: 'ORD004', client_id: 'TM003', symbol: 'HDFCBANK', qty: 15,  order_type: 'BUY',  status: 'EXECUTED', price: 1650.75, timestamp: now },
    { order_id: 'ORD005', client_id: 'TM004', symbol: 'NIFTY',    qty: 50,  order_type: 'BUY',  status: 'OPEN',     price: 22450.0, timestamp: now },
    { order_id: 'ORD006', client_id: 'TM005', symbol: 'WIPRO',    qty: 100, order_type: 'SELL', status: 'CANCELLED',price: 480.00,  timestamp: now },
    { order_id: 'ORD007', client_id: 'TM006', symbol: 'SBIN',     qty: 200, order_type: 'BUY',  status: 'EXECUTED', price: 620.50,  timestamp: now },
    { order_id: 'ORD008', client_id: 'TM007', symbol: 'BAJFINANCE',qty: 3,  order_type: 'SELL', status: 'EXECUTED', price: 6800.00, timestamp: now },
    { order_id: 'ORD009', client_id: 'TM009', symbol: 'RELIANCE', qty: 20,  order_type: 'BUY',  status: 'OPEN',     price: 2870.00, timestamp: now },
    { order_id: 'ORD010', client_id: 'TM010', symbol: 'ICICIBANK',qty: 50,  order_type: 'BUY',  status: 'EXECUTED', price: 1050.25, timestamp: now },
  ];

  for (const o of orders) {
    await prisma.orders.upsert({
      where: { id: o.order_id },
      update: {},
      create: { id: o.order_id, ...o, created_date: now, updated_date: now },
    });
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────
  const portfolio = [
    { client_id: 'TM001', symbol: 'RELIANCE',   qty: 10,  avg_price: 2850.50, ltp: 2910.00, pnl_unrealised: 595.00  },
    { client_id: 'TM001', symbol: 'HDFCBANK',   qty: 20,  avg_price: 1620.00, ltp: 1650.75, pnl_unrealised: 615.00  },
    { client_id: 'TM002', symbol: 'TCS',        qty: 5,   avg_price: 3650.00, ltp: 3680.00, pnl_unrealised: 150.00  },
    { client_id: 'TM002', symbol: 'INFY',       qty: 30,  avg_price: 1400.00, ltp: 1420.00, pnl_unrealised: 600.00  },
    { client_id: 'TM004', symbol: 'BAJFINANCE', qty: 5,   avg_price: 6750.00, ltp: 6800.00, pnl_unrealised: 250.00  },
    { client_id: 'TM005', symbol: 'WIPRO',      qty: 100, avg_price: 490.00,  ltp: 480.00,  pnl_unrealised: -1000.00},
    { client_id: 'TM006', symbol: 'SBIN',       qty: 200, avg_price: 615.00,  ltp: 620.50,  pnl_unrealised: 1100.00 },
    { client_id: 'TM007', symbol: 'NIFTY',      qty: 50,  avg_price: 22400.0, ltp: 22450.0, pnl_unrealised: 2500.00 },
    { client_id: 'TM009', symbol: 'ICICIBANK',  qty: 50,  avg_price: 1040.00, ltp: 1050.25, pnl_unrealised: 512.50  },
    { client_id: 'TM010', symbol: 'RELIANCE',   qty: 15,  avg_price: 2830.00, ltp: 2910.00, pnl_unrealised: 1200.00 },
  ];

  for (const p of portfolio) {
    await prisma.portfolio.upsert({
      where: { id: `${p.client_id}-${p.symbol}` },
      update: {},
      create: { id: `${p.client_id}-${p.symbol}`, ...p, created_date: now, updated_date: now },
    });
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  const tickets = [
    { ticket_id: 'TKT001', source: 'CALL',  status: 'IN_PROGRESS', priority: 'URGENT',  category: 'Compliance',     subject: 'Client requesting unauthorized fund transfer',         client_name: 'Rajesh Kumar',  client_phone: '+919876543210' },
    { ticket_id: 'TKT002', source: 'CALL',  status: 'OPEN',        priority: 'NORMAL',  category: 'Trading',        subject: 'Order placement issue for RELIANCE BUY',               client_name: 'Priya Sharma',  client_phone: '+919876543211' },
    { ticket_id: 'TKT003', source: 'EMAIL', status: 'OPEN',        priority: 'NORMAL',  category: 'Account Opening',subject: 'New demat account request - KYC documents attached',   client_name: 'Amit Patel',    client_email: 'amit@example.com' },
    { ticket_id: 'TKT004', source: 'CALL',  status: 'RESOLVED',    priority: 'LOW',     category: 'General Enquiry',subject: 'Query about trading hours for F&O segment',            client_name: 'Sunita Verma',  client_phone: '+919876543213' },
    { ticket_id: 'TKT005', source: 'CALL',  status: 'ESCALATED',   priority: 'URGENT',  category: 'Compliance',     subject: 'Margin call not honoured - position at risk',          client_name: 'Amit Patel',    client_phone: '+919876543212' },
    { ticket_id: 'TKT006', source: 'EMAIL', status: 'IN_PROGRESS', priority: 'NORMAL',  category: 'Fund Transfer',  subject: 'Withdrawal request ₹50,000 pending since 2 days',      client_name: 'Vikram Singh',  client_email: 'vikram@example.com' },
    { ticket_id: 'TKT007', source: 'CALL',  status: 'OPEN',        priority: 'NORMAL',  category: 'Platform Support',subject: 'App crashing while placing intraday orders',           client_name: 'Meera Nair',    client_phone: '+919876543215' },
    { ticket_id: 'TKT008', source: 'CALL',  status: 'RESOLVED',    priority: 'LOW',     category: 'General Enquiry',subject: 'P&L report for last financial year',                   client_name: 'Arjun Mehta',   client_phone: '+919876543216' },
    { ticket_id: 'TKT009', source: 'EMAIL', status: 'OPEN',        priority: 'URGENT',  category: 'Compliance',     subject: 'Suspicious login from unknown device reported',        client_name: 'Rohit Gupta',   client_email: 'rohit@example.com' },
    { ticket_id: 'TKT010', source: 'CALL',  status: 'IN_PROGRESS', priority: 'NORMAL',  category: 'Trading',        subject: 'NIFTY options buy order rejected at market open',      client_name: 'Kavya Reddy',   client_phone: '+919876543219' },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { ticket_id: t.ticket_id },
      update: {},
      create: { ...t, source_id: t.ticket_id, created_at: now, updated_at: now, created_date: now, updated_date: now },
    });
  }

  // ── Escalations ───────────────────────────────────────────────────────────
  const escalations = [
    { escalation_id: 'ESC001', session_id: 'TKT001', client_id: 'TM001', reason: 'Client requesting unauthorized fund transfer to third party account', handoff_context: 'Caller insists on transferring ₹2L to unknown account. Possible fraud.', status: 'OPEN' },
    { escalation_id: 'ESC002', session_id: 'TKT005', client_id: 'TM003', reason: 'Margin call not honoured — positions being forcibly squared off', handoff_context: 'Client has ₹10K shortfall. Has not responded to 3 alerts. Auto-squareoff initiated.', status: 'OPEN' },
    { escalation_id: 'ESC003', session_id: 'TKT009', client_id: 'TM009', reason: 'Suspicious login activity from unknown device', handoff_context: 'Login from IP 45.33.32.156 (US) at 2 AM IST. Client reports no travel.', status: 'IN_PROGRESS' },
  ];

  for (const e of escalations) {
    await prisma.escalation.upsert({
      where: { id: e.escalation_id },
      update: {},
      create: { id: e.escalation_id, ...e, created_date: now, updated_date: now },
    });
  }

  // ── PerformedActions ──────────────────────────────────────────────────────
  const actions = [
    { id: 'ACT001', recording_id: 'TKT001', session_id: 'TKT001', client_id: 'TM001', triage_type: 'Compliance', action_type: 'ESCALATION',      action_details: 'Escalated to compliance team for review', performed_by: 'AI Agent', performed_at: now, status: 'COMPLETED' },
    { id: 'ACT002', recording_id: 'TKT002', session_id: 'TKT002', client_id: 'TM002', triage_type: 'Trading',    action_type: 'ORDER_PLACED',     action_details: 'BUY order for 10 shares of RELIANCE at ₹2850', performed_by: 'AI Agent', performed_at: now, status: 'COMPLETED' },
    { id: 'ACT003', recording_id: 'TKT004', session_id: 'TKT004', client_id: 'TM004', triage_type: 'Enquiry',    action_type: 'INFO_PROVIDED',    action_details: 'Provided trading hours for F&O segment', performed_by: 'AI Agent', performed_at: now, status: 'COMPLETED' },
    { id: 'ACT004', recording_id: 'TKT010', session_id: 'TKT010', client_id: 'TM010', triage_type: 'Trading',    action_type: 'ORDER_CANCELLED',  action_details: 'Cancelled pending NIFTY order due to margin shortfall', performed_by: 'AI Agent', performed_at: now, status: 'COMPLETED' },
    { id: 'ACT005', recording_id: 'TKT006', session_id: 'TKT006', client_id: 'TM005', triage_type: 'Fund Transfer', action_type: 'TICKET_CREATED', action_details: 'Withdrawal ticket raised for ₹50,000', performed_by: 'AI Agent', performed_at: now, status: 'COMPLETED' },
  ];

  for (const a of actions) {
    await prisma.performedAction.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, created_date: now, updated_date: now },
    });
  }

  // ── Emails ────────────────────────────────────────────────────────────────
  const emails = [
    { message_id: 'MSG001', from_email: 'amit.patel@gmail.com',   from_name: 'Amit Patel',   subject: 'New Demat Account Opening Request', triage_category: 'New Account',   sub_category: 'Account Opening',  priority: 'NORMAL', routed_to: 'onboarding@brokerage.com', ai_summary: 'Client wants to open a new demat account and has attached KYC documents.' },
    { message_id: 'MSG002', from_email: 'vikram.singh@gmail.com', from_name: 'Vikram Singh', subject: 'Fund Transfer Delay',               triage_category: 'Transactional', sub_category: 'Fund Transfer',    priority: 'URGENT', routed_to: 'operations@brokerage.com', ai_summary: 'Withdrawal of ₹50,000 has been pending for 2 days. Client is frustrated.' },
    { message_id: 'MSG003', from_email: 'meera.nair@yahoo.com',   from_name: 'Meera Nair',   subject: 'App Not Working on Mobile',         triage_category: 'Informational', sub_category: 'Platform Support', priority: 'NORMAL', routed_to: 'support@brokerage.com',    ai_summary: 'Trading app crashes when placing intraday orders on Android.' },
    { message_id: 'MSG004', from_email: 'rohit.gupta@gmail.com',  from_name: 'Rohit Gupta',  subject: 'Suspicious Login Alert',            triage_category: 'Compliance',    sub_category: 'Compliance',       priority: 'URGENT', routed_to: 'compliance@brokerage.com', ai_summary: 'Client reporting unknown login from US IP at 2 AM. Possible account compromise.' },
    { message_id: 'MSG005', from_email: 'kavya.reddy@gmail.com',  from_name: 'Kavya Reddy',  subject: 'Query on Brokerage Charges',        triage_category: 'Informational', sub_category: 'General Enquiry',  priority: 'LOW',    routed_to: 'info@brokerage.com',       ai_summary: 'Client asking about brokerage charges for F&O trading.' },
  ];

  for (const e of emails) {
    await prisma.email.upsert({
      where: { message_id: e.message_id },
      update: {},
      create: { ...e, received_at: now, is_relevant: true, analysis_status: 'DONE', verification_status: 'UNVERIFIED', recommended_action: 'Review and respond', created_date: now, updated_date: now },
    });
  }

  // ── AI SOP Suggestions ────────────────────────────────────────────────────
  const suggestions = [
    { id: 'SOP001', category: 'Compliance', title: 'Mandatory callback for fund transfers above ₹1L', steps: '1. Flag all transfer requests above ₹1L\n2. Initiate AI callback to client\n3. Verify identity with OTP + security question\n4. Process only after dual confirmation', reasoning: '3 out of 5 escalations in last 30 days involved large unauthorized transfers.', estimated_impact: 'Reduce compliance escalations by ~60%', status: 'PENDING', confidence_score: 0.91 },
    { id: 'SOP002', category: 'Trading',    title: 'Auto-pause new orders during margin call',        steps: '1. Monitor available margin in real-time\n2. When margin < 20% of required, block new order placement\n3. Send automated alert via call + SMS\n4. Allow orders only after margin is topped up', reasoning: '2 clients faced forced square-off due to delayed margin top-up.', estimated_impact: 'Prevent ₹2L+ in forced liquidation losses monthly', status: 'APPROVED', confidence_score: 0.88 },
    { id: 'SOP003', category: 'Platform Support', title: 'Proactive app health check before market open', steps: '1. Run automated health check at 8:45 AM daily\n2. Test order placement, market data feed, and login\n3. If any failure detected, alert support team immediately\n4. Post status update on client communication channel', reasoning: 'App crash tickets spike in the first 30 minutes of market open.', estimated_impact: 'Reduce platform support tickets by ~40%', status: 'PENDING', confidence_score: 0.85 },
  ];

  for (const s of suggestions) {
    await prisma.aISOPSuggestion.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, created_date: now, updated_date: now },
    });
  }

  console.log('✅ Seed complete — FAQs, Clients, Margins, Orders, Portfolio, Tickets, Escalations, Actions, Emails, SOP Suggestions all populated.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

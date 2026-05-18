import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from '../openai/openai.service';
import { GmailAuthService } from '../gmail/gmail-auth.service';
import {
  DERIVE_SUB_CATEGORY_PROMPT,
  EMAIL_RELEVANCE_PROMPT,
  EMAIL_TRIAGE_PROMPT,
  INGEST_RECORDING_SYSTEM_PROMPT,
  SOP_SUGGESTIONS_PROMPT,
} from './prompts';
import {
  makeEscalationId,
  makeTicketId,
  nowIso,
  parseAnalysis,
  riskToPriority,
  triageCall,
} from './helpers';

@Injectable()
export class FunctionsService {
  private readonly logger = new Logger(FunctionsService.name);

  constructor(
    private prisma: PrismaService,
    private openai: OpenAIService,
    private gmailAuth: GmailAuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // ingestRecording — runs the call-analysis prompt over a transcript and
  // stores the AI extraction on the matching CallRecording.
  // ---------------------------------------------------------------------------
  async ingestRecording(body: any) {
    const { session_id, transcript, duration_seconds } = body;
    if (!session_id || !transcript) {
      throw new BadRequestException('session_id and transcript are required');
    }

    const record = await this.prisma.callRecording.findFirst({ where: { session_id } });
    if (!record) {
      return { error: 'No CallRecording found for this session_id', status: 404 };
    }

    await this.prisma.callRecording.update({
      where: { id: record.id },
      data: { analysis_status: 'ANALYZING' },
    });

    let analysisStatus = 'DONE';
    let aiAnalysis: string | null = null;
    let sub_category: string | null = null;
    let priority = 'NORMAL';

    try {
      const aiResult = await this.openai.invoke({
        prompt: `${INGEST_RECORDING_SYSTEM_PROMPT}\n\nTRANSCRIPT:\n${transcript}\n\nDURATION_SECONDS: ${
          duration_seconds || record.duration_seconds || 120
        }`,
        response_json_schema: { type: 'object' },
      });

      if (aiResult) {
        try {
          const parsed = typeof aiResult === 'string' ? JSON.parse(aiResult) : aiResult;
          aiAnalysis = JSON.stringify(parsed);

          if (parsed.call_type && parsed.summary) {
            const urgencyList = (parsed.extractions || [])
              .map((e: any) => e.urgency)
              .filter(Boolean)
              .join(', ');

            const deriv = await this.openai.invoke({
              prompt: DERIVE_SUB_CATEGORY_PROMPT({
                call_type: parsed.call_type,
                overall_risk: parsed.overall_risk || 'MEDIUM',
                summary: parsed.summary,
                recommended_action: parsed.recommended_action || '',
                urgencyList,
              }),
              response_json_schema: { type: 'object' },
            });

            try {
              const derivParsed = typeof deriv === 'string' ? JSON.parse(deriv) : deriv;
              sub_category = derivParsed.sub_category || null;
              priority = derivParsed.priority || 'NORMAL';
            } catch {
              priority = 'NORMAL';
            }
          }
        } catch {
          aiAnalysis = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);
        }
      } else {
        analysisStatus = 'FAILED';
      }
    } catch (e) {
      this.logger.error(`ingestRecording failed: ${(e as Error).message}`);
      analysisStatus = 'FAILED';
    }

    await this.prisma.callRecording.update({
      where: { id: record.id },
      data: {
        analysis_status: analysisStatus,
        ai_analysis: aiAnalysis,
        sub_category,
        priority,
        updated_date: nowIso(),
      },
    });

    return { success: true, session_id, analysis_status: analysisStatus };
  }

  // ---------------------------------------------------------------------------
  // ingestEmail — strict relevance gate, then full triage, then persist.
  // ---------------------------------------------------------------------------
  async ingestEmail(body: any) {
    const { message_id, from_email, from_name, subject, body: emailBody, received_at } = body;
    if (!message_id || !from_email || !subject) {
      throw new BadRequestException('message_id, from_email, and subject are required');
    }

    const existing = await this.prisma.email.findUnique({ where: { message_id } });
    if (existing) {
      return {
        success: true,
        message_id,
        analysis_status: existing.analysis_status,
        duplicate: true,
      };
    }

    const relevance = await this.openai.invoke({
      prompt: EMAIL_RELEVANCE_PROMPT({ from_email, from_name, subject, body: emailBody }),
      response_json_schema: { type: 'object' },
    });

    if (!relevance?.relevant) {
      return { success: true, skipped: true, reason: relevance?.reason || 'not relevant' };
    }

    const ai = await this.openai.invoke({
      prompt: EMAIL_TRIAGE_PROMPT({ from_email, subject, body: emailBody }),
      response_json_schema: { type: 'object' },
    });

    await this.prisma.email.create({
      data: {
        message_id,
        from_email,
        from_name: from_name || '',
        subject,
        body: emailBody || '',
        received_at: received_at || nowIso(),
        is_relevant: true,
        triage_category: ai?.triage_category || '',
        sub_category: ai?.sub_category || '',
        priority: ai?.priority || 'NORMAL',
        ai_summary: ai?.ai_summary || '',
        recommended_action: ai?.recommended_action || '',
        routed_to: ai?.routed_to || '',
        ai_analysis: JSON.stringify(ai),
        analysis_status: 'DONE',
        verification_status: 'UNVERIFIED',
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    });

    return {
      success: true,
      message_id,
      analysis_status: 'DONE',
      triage_category: ai?.triage_category,
      sub_category: ai?.sub_category,
      priority: ai?.priority,
    };
  }

  // ---------------------------------------------------------------------------
  // ticketAutomation — branches on event_type to keep tickets/escalations in
  // sync with verified recordings, performed actions, and email triage.
  // ---------------------------------------------------------------------------
  async ticketAutomation(payload: any) {
    const { event_type } = payload || {};

    if (event_type === 'recording_verified') {
      return this.handleRecordingVerified(payload);
    }
    if (event_type === 'performed_action_created') {
      return this.handlePerformedActionCreated(payload);
    }
    if (event_type === 'create_email_ticket') {
      return this.handleCreateEmailTicket(payload);
    }
    if (event_type === 'bulk_sync') {
      return this.handleBulkSync(payload);
    }
    throw new BadRequestException('Unknown event_type');
  }

  private async handleRecordingVerified(payload: any) {
    const { recording_id } = payload;
    const rec = await this.prisma.callRecording.findUnique({ where: { id: recording_id } });
    if (!rec) return { error: 'Recording not found', status: 404 };

    const existing = await this.prisma.ticket.findMany({ where: { source_id: rec.session_id } });

    if (rec.verification_status === 'REJECTED') {
      if (existing.length > 0) {
        await this.prisma.ticket.update({
          where: { id: existing[0].id },
          data: {
            status: 'RESOLVED',
            resolution_notes: 'Call rejected during verification',
            updated_at: nowIso(),
            resolved_at: nowIso(),
            updated_date: nowIso(),
          },
        });
        return { updated: true, ticket_id: existing[0].ticket_id };
      }
      return { skipped: true, reason: 'no ticket found for rejected recording' };
    }

    if (rec.verification_status === 'VERIFIED' && rec.analysis_status === 'DONE') {
      if (existing.length > 0) {
        await this.prisma.ticket.update({
          where: { id: existing[0].id },
          data: { status: 'IN_PROGRESS', updated_at: nowIso(), updated_date: nowIso() },
        });
        return { updated: true, ticket_id: existing[0].ticket_id };
      }

      const analysis = parseAnalysis(rec.ai_analysis);
      const client = rec.client_id
        ? await this.prisma.client.findFirst({ where: { client_id: rec.client_id } })
        : null;
      const category = triageCall(rec, analysis);
      const priority = riskToPriority(analysis?.overall_risk);
      const ticketId = makeTicketId();
      const now = nowIso();
      const ticketStatus = category === 'Compliance' ? 'ESCALATED' : 'IN_PROGRESS';

      await this.prisma.ticket.create({
        data: {
          ticket_id: ticketId,
          source: 'CALL',
          status: ticketStatus,
          priority,
          category,
          subject: analysis?.summary ? analysis.summary.slice(0, 120) : 'Call recording verified',
          client_name: client?.name || '',
          client_phone: client?.phone || '',
          source_id: rec.session_id,
          raw_summary: [analysis?.summary, analysis?.recommended_action].filter(Boolean).join('\n\n'),
          created_at: now,
          updated_at: now,
          created_date: now,
          updated_date: now,
        },
      });

      if (category === 'Compliance') {
        await this.prisma.escalation.create({
          data: {
            escalation_id: makeEscalationId(),
            session_id: rec.session_id,
            client_id: rec.client_id || '',
            reason: analysis?.summary ? analysis.summary.slice(0, 200) : 'Compliance issue detected',
            handoff_context: [analysis?.summary, analysis?.recommended_action]
              .filter(Boolean)
              .join('\n\n'),
            status: 'OPEN',
            created_date: now,
            updated_date: now,
          },
        });
      }

      return { created: true, ticket_id: ticketId };
    }

    return { skipped: true, reason: 'recording not in actionable state' };
  }

  private async handlePerformedActionCreated(payload: any) {
    const { performed_action_id } = payload;
    const action = await this.prisma.performedAction.findUnique({
      where: { id: performed_action_id },
    });
    if (!action) return { error: 'Action not found', status: 404 };
    if (!action.session_id) return { skipped: true, reason: 'no session_id on action' };

    const existing = await this.prisma.ticket.findMany({
      where: { source_id: action.session_id },
    });
    if (existing.length > 0) {
      await this.prisma.ticket.update({
        where: { id: existing[0].id },
        data: {
          status: 'IN_PROGRESS',
          performed_action_id: action.id,
          updated_at: nowIso(),
          updated_date: nowIso(),
        },
      });
      return { updated: true, ticket_id: existing[0].ticket_id };
    }
    return { skipped: true, reason: 'no matching ticket' };
  }

  private async handleCreateEmailTicket(payload: any) {
    const { email } = payload;
    if (!email) throw new BadRequestException('email data required');

    const existing = await this.prisma.ticket.findMany({
      where: { source_id: email.source_id },
    });
    if (existing.length > 0) {
      return {
        skipped: true,
        reason: 'ticket already exists',
        ticket_id: existing[0].ticket_id,
      };
    }

    const ticketId = makeTicketId();
    const now = nowIso();
    const emailCategory = email.category || 'General Enquiry';
    const isCompliance = emailCategory === 'Compliance';

    await this.prisma.ticket.create({
      data: {
        ticket_id: ticketId,
        source: 'EMAIL',
        status: isCompliance ? 'ESCALATED' : 'OPEN',
        priority: email.priority || 'NORMAL',
        category: emailCategory,
        subject: email.subject || '',
        client_name: email.client_name || '',
        client_email: email.client_email || '',
        source_id: email.source_id,
        raw_summary: email.raw_summary || '',
        created_at: now,
        updated_at: now,
        created_date: now,
        updated_date: now,
      },
    });

    if (isCompliance) {
      await this.prisma.escalation.create({
        data: {
          escalation_id: makeEscalationId(),
          session_id: email.source_id || '',
          client_id: '',
          reason: email.subject || 'Compliance email received',
          handoff_context: email.raw_summary || '',
          status: 'OPEN',
          created_date: now,
          updated_date: now,
        },
      });
    }

    return { created: true, ticket_id: ticketId };
  }

  private async handleBulkSync(payload: any) {
    const results = { calls_created: 0, emails_created: 0 };

    const recordings = await this.prisma.callRecording.findMany({
      where: { verification_status: 'VERIFIED', analysis_status: 'DONE' },
    });

    for (const rec of recordings) {
      if (!rec.session_id) continue;
      const existing = await this.prisma.ticket.findMany({
        where: { source_id: rec.session_id },
      });
      if (existing.length > 0) continue;

      const analysis = parseAnalysis(rec.ai_analysis);
      const client = rec.client_id
        ? await this.prisma.client.findFirst({ where: { client_id: rec.client_id } })
        : null;
      const category = triageCall(rec, analysis);
      const priority = riskToPriority(analysis?.overall_risk);
      const now = nowIso();

      await this.prisma.ticket.create({
        data: {
          ticket_id: makeTicketId(),
          source: 'CALL',
          status: 'IN_PROGRESS',
          priority,
          category,
          subject: analysis?.summary ? analysis.summary.slice(0, 120) : 'Call recording verified',
          client_name: client?.name || '',
          client_phone: client?.phone || '',
          source_id: rec.session_id,
          raw_summary: [analysis?.summary, analysis?.recommended_action]
            .filter(Boolean)
            .join('\n\n'),
          created_at: now,
          updated_at: now,
          created_date: now,
          updated_date: now,
        },
      });
      results.calls_created++;
    }

    const { emails = [] } = payload;
    for (const email of emails) {
      if (!email.source_id) continue;
      const existing = await this.prisma.ticket.findMany({
        where: { source_id: email.source_id },
      });
      if (existing.length > 0) continue;

      const now = nowIso();
      await this.prisma.ticket.create({
        data: {
          ticket_id: makeTicketId(),
          source: 'EMAIL',
          status: 'OPEN',
          priority: email.priority || 'NORMAL',
          category: email.category || 'General Enquiry',
          subject: email.subject || '',
          client_name: email.client_name || '',
          client_email: email.client_email || '',
          source_id: email.source_id,
          raw_summary: email.raw_summary || '',
          created_at: now,
          updated_at: now,
          created_date: now,
          updated_date: now,
        },
      });
      results.emails_created++;
    }

    return { synced: true, ...results };
  }

  // ---------------------------------------------------------------------------
  // clientLookup({ phone })
  // ---------------------------------------------------------------------------
  async clientLookup({ phone }: { phone: string }) {
    if (!phone) throw new BadRequestException('phone is required');
    const c = await this.prisma.client.findFirst({ where: { phone } });
    if (!c) return { error: 'Client not found', status: 404 };
    return {
      client_id: c.client_id,
      name: c.name,
      phone: c.phone,
      pan: c.pan,
      kyc_status: c.kyc_status,
      broker_code: c.broker_code,
    };
  }

  // ---------------------------------------------------------------------------
  // getOrders({ client_id, status? })
  // ---------------------------------------------------------------------------
  async getOrders({ client_id, status }: { client_id: string; status?: string }) {
    if (!client_id) throw new BadRequestException('client_id is required');
    const where: any = { client_id };
    if (status) where.status = status;
    const orders = await this.prisma.orders.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
    return { orders };
  }

  // ---------------------------------------------------------------------------
  // getMargin({ client_id })
  // ---------------------------------------------------------------------------
  async getMargin({ client_id }: { client_id: string }) {
    if (!client_id) throw new BadRequestException('client_id is required');
    const m = await this.prisma.margin.findFirst({ where: { client_id } });
    if (!m) return { error: 'Margin data not found', status: 404 };
    return {
      total_margin: m.total_margin,
      used_margin: m.used_margin,
      available_margin: m.available_margin,
      margin_call: (m.available_margin || 0) < 25000,
    };
  }

  // ---------------------------------------------------------------------------
  // getPortfolio({ client_id })
  // ---------------------------------------------------------------------------
  async getPortfolio({ client_id }: { client_id: string }) {
    if (!client_id) throw new BadRequestException('client_id is required');
    const positions = await this.prisma.portfolio.findMany({ where: { client_id } });

    let totalInvestment = 0;
    let currentValue = 0;
    const portfolio = positions.map((p) => {
      const inv = (p.qty || 0) * (p.avg_price || 0);
      const cur = (p.qty || 0) * (p.ltp || 0);
      totalInvestment += inv;
      currentValue += cur;
      return {
        symbol: p.symbol,
        qty: p.qty,
        avg_price: p.avg_price,
        ltp: p.ltp,
        pnl_unrealised: p.pnl_unrealised,
      };
    });

    return {
      positions: portfolio,
      summary: {
        total_investment: totalInvestment,
        current_value: currentValue,
        total_pnl: currentValue - totalInvestment,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // cancelOrder({ order_id, client_id })
  // ---------------------------------------------------------------------------
  async cancelOrder({ order_id, client_id }: { order_id: string; client_id: string }) {
    if (!order_id || !client_id) {
      throw new BadRequestException('order_id and client_id are required');
    }
    const order = await this.prisma.orders.findFirst({ where: { order_id, client_id } });
    if (!order) return { error: 'Order not found', status: 404 };
    if (order.status !== 'OPEN') {
      return { error: `Cannot cancel order with status ${order.status}`, status: 400 };
    }
    await this.prisma.orders.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', updated_date: nowIso() },
    });
    return { success: true, message: `Order ${order_id} for ${order.symbol} cancelled successfully` };
  }

  // ---------------------------------------------------------------------------
  // squareOff({ symbol, client_id })
  // ---------------------------------------------------------------------------
  async squareOff({ symbol, client_id }: { symbol: string; client_id: string }) {
    if (!symbol || !client_id) {
      throw new BadRequestException('symbol and client_id are required');
    }
    const pos = await this.prisma.portfolio.findFirst({ where: { client_id, symbol } });
    if (!pos) return { error: 'Position not found', status: 404 };
    await this.prisma.portfolio.update({
      where: { id: pos.id },
      data: { qty: 0, pnl_unrealised: 0, updated_date: nowIso() },
    });
    return { success: true, message: `Position in ${symbol} squared off` };
  }

  // ---------------------------------------------------------------------------
  // searchFaq({ query })
  // ---------------------------------------------------------------------------
  async searchFaq({ query }: { query: string }) {
    if (!query) throw new BadRequestException('query is required');
    const allFaqs = await this.prisma.fAQ.findMany();
    const keywords = query.toLowerCase().split(/\s+/);

    const scored = allFaqs.map((faq) => {
      const text = (faq.question + ' ' + faq.answer).toLowerCase();
      let score = 0;
      for (const kw of keywords) if (text.includes(kw)) score++;
      return { faq, score };
    });

    const results = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => ({
        faq_id: s.faq.faq_id,
        question: s.faq.question,
        answer: s.faq.answer,
        category: s.faq.category,
      }));

    return { faqs: results };
  }

  // ---------------------------------------------------------------------------
  // saveConversation(body)
  // ---------------------------------------------------------------------------
  async saveConversation(body: any) {
    const {
      session_id,
      client_id,
      channel,
      bucket,
      summary,
      transcript,
      status,
      duration_seconds,
    } = body;
    if (!session_id || !client_id) {
      throw new BadRequestException('session_id and client_id are required');
    }
    await this.prisma.conversation.create({
      data: {
        session_id,
        client_id,
        channel: channel || 'VOICE',
        bucket: bucket || 'A',
        summary: summary || '',
        transcript: transcript || '',
        status: status || 'IN_PROGRESS',
        duration_seconds: duration_seconds || 0,
        timestamp: nowIso(),
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // generateSOPSuggestions({ tickets, actions })
  // ---------------------------------------------------------------------------
  async generateSOPSuggestions(payload: any) {
    const { tickets = [], actions = [] } = payload || {};
    const categoryCounts: Record<string, number> = {};
    const escalatedByCategory: Record<string, number> = {};
    const resolvedByCategory: Record<string, number> = {};
    let totalResolved = 0,
      totalEscalated = 0,
      totalOpen = 0;

    tickets.forEach((t: any) => {
      const cat = t.category || 'Unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (t.status === 'RESOLVED') {
        resolvedByCategory[cat] = (resolvedByCategory[cat] || 0) + 1;
        totalResolved++;
      }
      if (t.status === 'ESCALATED') {
        escalatedByCategory[cat] = (escalatedByCategory[cat] || 0) + 1;
        totalEscalated++;
      }
      if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') totalOpen++;
    });

    const actionTypeCounts: Record<string, number> = {};
    actions.forEach((a: any) => {
      const t = a.action_type || 'OTHER';
      actionTypeCounts[t] = (actionTypeCounts[t] || 0) + 1;
    });

    const statsContext = {
      total_tickets: tickets.length,
      total_resolved: totalResolved,
      total_escalated: totalEscalated,
      total_open: totalOpen,
      resolution_rate_pct: tickets.length ? Math.round((totalResolved / tickets.length) * 100) : 0,
      escalation_rate_pct: tickets.length ? Math.round((totalEscalated / tickets.length) * 100) : 0,
      category_counts: categoryCounts,
      escalated_by_category: escalatedByCategory,
      resolved_by_category: resolvedByCategory,
      action_type_counts: actionTypeCounts,
    };

    const result = await this.openai.invoke({
      prompt: SOP_SUGGESTIONS_PROMPT(statsContext),
      response_json_schema: { type: 'object' },
    });

    return { suggestions: result?.suggestions || [] };
  }

  // ---------------------------------------------------------------------------
  // syncBolnaCalls — pull completed executions from Bolna, persist new
  // CallRecording rows, kick off ingestRecording per new row.
  // ---------------------------------------------------------------------------
  async syncBolnaCalls() {
    const apiKey = process.env.BOLNA_API_KEY;
    const agentId = process.env.BOLNA_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new BadRequestException('BOLNA_API_KEY and BOLNA_AGENT_ID must be configured');
    }

    let pageNumber = 1;
    let hasMore = true;
    let synced = 0;
    let skipped = 0;

    while (hasMore) {
      const url = `https://api.bolna.ai/agent/${agentId}/executions?page_number=${pageNumber}&page_size=50&status=completed`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new BadRequestException(`Bolna API error ${response.status}: ${errBody || response.statusText}`);
      }
      const data: any = await response.json();
      const executions = data.executions || data.data || (Array.isArray(data) ? data : []);
      hasMore = data.has_more || false;

      for (const exec of executions) {
        try {
          if (!exec.transcript) {
            skipped++;
            continue;
          }
          const sessionId = exec.id;
          const existing = await this.prisma.callRecording.findFirst({
            where: { session_id: sessionId },
          });
          if (existing) {
            skipped++;
            continue;
          }

          const clientId =
            exec.context_details?.client_id ||
            exec.to ||
            exec.telephony_data?.to_number ||
            '';
          const recordingUrl = exec.telephony_data?.recording_url || '';
          const durationSeconds = exec.telephony_data?.duration || exec.conversation_time || 0;
          const receivedAt = exec.created_at || nowIso();

          await this.prisma.callRecording.create({
            data: {
              session_id: sessionId,
              client_id: clientId,
              recording_url: recordingUrl,
              transcript: exec.transcript,
              duration_seconds: Number(durationSeconds),
              received_at: receivedAt,
              analysis_status: 'PENDING',
              verification_status: 'UNVERIFIED',
              created_date: nowIso(),
              updated_date: nowIso(),
            },
          });

          // Fire-and-forget analysis — keep sync moving even if a single
          // transcript fails to parse.
          this.ingestRecording({
            session_id: sessionId,
            client_id: clientId,
            recording_url: recordingUrl,
            transcript: exec.transcript,
            duration_seconds: Number(durationSeconds),
          }).catch((e) => this.logger.warn(`ingest after sync failed: ${e.message}`));

          synced++;
        } catch (e) {
          this.logger.warn(`Failed to process execution ${exec.id}: ${(e as Error).message}`);
          skipped++;
        }
      }

      pageNumber++;
    }

    return { success: true, synced, skipped };
  }

  // ---------------------------------------------------------------------------
  // bolnaWebhook — Bolna posts execution status here. Secret validated by
  // controller before this is called. Same gating + ingestRecording trigger.
  // ---------------------------------------------------------------------------
  async bolnaWebhook(body: any) {
    const { execution_id, call_sid, to, status, duration, recording_url, transcript, telephony_data } =
      body || {};

    const client_id = to || telephony_data?.to_number || '';
    const session_id = execution_id || call_sid || `bolna-${Date.now()}`;
    const actual_recording_url = recording_url || telephony_data?.recording_url || '';
    const actual_duration = duration || telephony_data?.duration || 0;

    const ENDED = ['completed', 'disconnected', 'ended', 'failed', 'hangup', 'call-disconnected'];
    if (!status || !ENDED.includes(status)) {
      return { success: true, skipped: true, reason: 'call not ended yet' };
    }
    if (!transcript || transcript.trim().length === 0) {
      return { success: true, skipped: true, reason: 'no transcript' };
    }
    if (!actual_duration || Number(actual_duration) <= 0) {
      return { success: true, skipped: true, reason: 'zero duration' };
    }

    const existing = await this.prisma.callRecording.findFirst({ where: { session_id } });
    if (existing) {
      if (existing.analysis_status === 'PENDING') {
        await this.prisma.callRecording.update({
          where: { id: existing.id },
          data: {
            recording_url: actual_recording_url,
            transcript: transcript || '',
            duration_seconds: actual_duration ? Number(actual_duration) : 0,
            updated_date: nowIso(),
          },
        });
        return { success: true, session_id, action: 'updated_pending' };
      }
      return { success: true, session_id, action: 'skipped_already_processed' };
    }

    await this.prisma.callRecording.create({
      data: {
        session_id,
        client_id: client_id || '',
        recording_url: actual_recording_url,
        transcript: transcript || '',
        duration_seconds: actual_duration ? Number(actual_duration) : 0,
        received_at: nowIso(),
        analysis_status: 'PENDING',
        verification_status: 'UNVERIFIED',
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    });

    this.ingestRecording({
      session_id,
      client_id: client_id || '',
      recording_url: actual_recording_url,
      transcript: transcript || '',
      duration_seconds: actual_duration ? Number(actual_duration) : 0,
    }).catch((e) => this.logger.warn(`ingest after webhook failed: ${e.message}`));

    return { success: true, session_id, action: 'created_and_analyzing' };
  }

  validateBolnaSecret(authHeader: string, secretHeader: string) {
    const apiKey = process.env.BOLNA_WEBHOOK_SECRET || process.env.BOLNA_API_KEY;
    if (!apiKey) throw new UnauthorizedException('Webhook secret not configured');
    const token = (authHeader || '').replace('Bearer ', '').trim() || (secretHeader || '').trim();
    if (token !== apiKey) throw new UnauthorizedException('Invalid webhook secret');
  }

  // ---------------------------------------------------------------------------
  // triggerBolnaCall — outbound call to a phone number.
  // ---------------------------------------------------------------------------
  async triggerBolnaCall(payload: any) {
    const apiKey = process.env.BOLNA_API_KEY;
    const agentId = process.env.BOLNA_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new BadRequestException('BOLNA_API_KEY and BOLNA_AGENT_ID must be configured');
    }
    const { phone, client_name, client_id } = payload || {};
    if (!phone) throw new BadRequestException('phone is required');

    let formattedPhone = phone.toString().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) formattedPhone = '+91' + formattedPhone;

    const response = await fetch('https://api.bolna.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        recipient_phone_number: formattedPhone,
        user_data: { client_name: client_name || '', client_id: client_id || '' },
      }),
    });

    const data: any = await response.json();
    if (!response.ok) {
      return { error: data?.detail || 'Bolna API error', details: data, status: response.status };
    }
    return { success: true, execution_id: data.execution_id, status: data.status };
  }

  // ---------------------------------------------------------------------------
  // backfillCallRecordings — for any DONE recordings that lack a sub_category,
  // re-run the derivation step against the stored ai_analysis.
  // ---------------------------------------------------------------------------
  async backfillCallRecordings() {
    const recordings = await this.prisma.callRecording.findMany({ take: 1000 });
    const needsBackfill = recordings.filter(
      (r) => !r.sub_category && r.ai_analysis && r.analysis_status === 'DONE',
    );

    let updated = 0;
    for (const record of needsBackfill) {
      try {
        const analysis =
          typeof record.ai_analysis === 'string'
            ? JSON.parse(record.ai_analysis as string)
            : record.ai_analysis;

        const urgencyList = (analysis.extractions || [])
          .map((e: any) => e.urgency)
          .filter(Boolean)
          .join(', ');

        const deriv = await this.openai.invoke({
          prompt: DERIVE_SUB_CATEGORY_PROMPT({
            call_type: analysis.call_type || 'Unknown',
            overall_risk: analysis.overall_risk || 'MEDIUM',
            summary: analysis.summary || '',
            recommended_action: analysis.recommended_action || '',
            urgencyList,
          }),
          response_json_schema: { type: 'object' },
        });

        await this.prisma.callRecording.update({
          where: { id: record.id },
          data: {
            sub_category: deriv?.sub_category || null,
            priority: deriv?.priority || 'NORMAL',
            updated_date: nowIso(),
          },
        });
        updated++;
      } catch (e) {
        this.logger.warn(`Backfill failed for ${record.id}: ${(e as Error).message}`);
      }
    }

    return { success: true, total_needing_backfill: needsBackfill.length, updated };
  }

  // ---------------------------------------------------------------------------
  // simulateCall — inject a transcript directly into the pipeline for testing
  // without a live Bolna connection. Creates a CallRecording, runs AI analysis,
  // and returns the session_id so the UI can navigate to the result.
  // ---------------------------------------------------------------------------
  async simulateCall(body: any) {
    const { transcript, client_id, duration_seconds } = body || {};
    if (!transcript || transcript.trim().length < 10) {
      throw new BadRequestException('transcript is required (min 10 chars)');
    }

    const session_id = `sim-${Date.now()}`;

    await this.prisma.callRecording.create({
      data: {
        session_id,
        client_id: client_id || '',
        recording_url: '',
        transcript: transcript.trim(),
        duration_seconds: Number(duration_seconds) || 120,
        received_at: nowIso(),
        analysis_status: 'PENDING',
        verification_status: 'UNVERIFIED',
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    });

    await this.ingestRecording({
      session_id,
      transcript: transcript.trim(),
      duration_seconds: Number(duration_seconds) || 120,
    });

    const record = await this.prisma.callRecording.findFirst({ where: { session_id } });
    return {
      success: true,
      session_id,
      recording_id: record?.id,
      analysis_status: record?.analysis_status,
    };
  }

  // ---------------------------------------------------------------------------
  // createEscalation
  // ---------------------------------------------------------------------------
  async createEscalation(payload: any) {
    const { session_id, client_id, reason, handoff_context } = payload || {};
    if (!session_id || !client_id || !reason) {
      throw new BadRequestException('session_id, client_id, and reason are required');
    }
    const escalationId = 'ESC' + Date.now().toString().slice(-6);
    await this.prisma.escalation.create({
      data: {
        escalation_id: escalationId,
        session_id,
        client_id,
        reason,
        handoff_context: handoff_context || '',
        assigned_agent: '',
        status: 'OPEN',
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    });
    return { success: true, escalation_id: escalationId };
  }

  // ---------------------------------------------------------------------------
  // fetchGmailEmails — pulls top 20 unread Trademax-support emails.
  // Uses OAuth token from GmailAuthService (auto-refreshes) with fallback to
  // the manual GMAIL_ACCESS_TOKEN env var.
  // ---------------------------------------------------------------------------
  async fetchGmailEmails(body: any) {
    const accessToken = await this.gmailAuth.getAccessToken();
    if (!accessToken) {
      throw new BadRequestException('Gmail not connected. Visit /api/auth/gmail/connect to authorise.');
    }

    if (body?.check_connection) {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile: any = await profileRes.json();
      const connectedEmail = this.gmailAuth.getConnectedEmail() || profile.emailAddress || '';
      return { connected_email: connectedEmail };
    }

    // Fetch unread, non-promotional emails — the AI relevance gate then filters
    // for Trademax support queries specifically (trading, demat, KYC, etc).
    const q = encodeURIComponent(
      'is:unread -category:promotions -category:social -category:updates -category:forums -category:spam',
    );
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) return { error: 'Failed to fetch Gmail list', status: 500 };
    const listData: any = await listRes.json();
    const messageIds: string[] = listData.messages?.map((m: any) => m.id) || [];

    const parsedEmails = await Promise.all(
      messageIds.map(async (id) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!res.ok) return null;
        const msg: any = await res.json();
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const fromRaw = getHeader('From');
        const fromMatch = fromRaw.match(/^(.*?)\s*<(.+)>$/);
        const from_name = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : fromRaw;
        const from_email = fromMatch ? fromMatch[2].trim() : fromRaw;
        const subject = getHeader('Subject');
        const received_at = new Date(parseInt(msg.internalDate)).toISOString();
        const emailBody = extractGmailBody(msg.payload || {});
        return { id, from_email, from_name, from: fromRaw, subject, received_at, body: emailBody };
      }),
    );

    const valid = parsedEmails.filter(Boolean) as any[];
    const BATCH = 5;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      await Promise.all(
        batch.map((e) =>
          this.ingestEmail({
            message_id: e.id,
            from_email: e.from_email,
            from_name: e.from_name,
            subject: e.subject,
            body: e.body,
            received_at: e.received_at,
          }).catch(() => null),
        ),
      );
    }

    const emails = valid.map((e) => ({
      id: e.id,
      from: e.from,
      from_email: e.from_email,
      from_name: e.from_name,
      subject: e.subject,
      date: e.received_at,
      snippet: (e.body || '').substring(0, 200) || e.subject,
    }));

    return { emails };
  }
}

function decodeBase64Url(data: string): string {
  try {
    const fixed = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(fixed, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function extractGmailBody(payload: any): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);
    const html = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (html?.body?.data) {
      const decoded = decodeBase64Url(html.body.data);
      return decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractGmailBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

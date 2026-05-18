-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pan" TEXT,
    "broker_code" TEXT,
    "kyc_status" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRecording" (
    "id" TEXT NOT NULL,
    "recording_id" TEXT,
    "session_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "recording_url" TEXT,
    "transcript" TEXT,
    "duration_seconds" DOUBLE PRECISION,
    "received_at" TEXT,
    "analysis_status" TEXT NOT NULL DEFAULT 'PENDING',
    "ai_analysis" TEXT,
    "sub_category" TEXT,
    "priority" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verified_by" TEXT,
    "verified_at" TEXT,
    "notes" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "channel" TEXT,
    "bucket" TEXT,
    "summary" TEXT,
    "transcript" TEXT,
    "status" TEXT,
    "duration_seconds" DOUBLE PRECISION,
    "timestamp" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "received_at" TEXT,
    "is_relevant" BOOLEAN NOT NULL DEFAULT true,
    "triage_category" TEXT,
    "sub_category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "ai_summary" TEXT,
    "ai_analysis" TEXT,
    "recommended_action" TEXT,
    "routed_to" TEXT,
    "analysis_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verified_by" TEXT,
    "verified_at" TEXT,
    "notes" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "escalation_id" TEXT,
    "session_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "handoff_context" TEXT,
    "assigned_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "faq_id" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "broker_code" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Margin" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "total_margin" DOUBLE PRECISION,
    "used_margin" DOUBLE PRECISION,
    "available_margin" DOUBLE PRECISION,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Margin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "client_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "order_type" TEXT,
    "status" TEXT,
    "price" DOUBLE PRECISION,
    "timestamp" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformedAction" (
    "id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "session_id" TEXT,
    "client_id" TEXT NOT NULL,
    "triage_type" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_details" TEXT,
    "performed_by" TEXT NOT NULL,
    "performed_at" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PerformedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "avg_price" DOUBLE PRECISION,
    "ltp" DOUBLE PRECISION,
    "pnl_unrealised" DOUBLE PRECISION,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportQuery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "submitted_at" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SupportQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "subject" TEXT,
    "client_name" TEXT,
    "client_phone" TEXT,
    "client_email" TEXT,
    "assigned_to" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT,
    "resolved_at" TEXT,
    "resolution_notes" TEXT,
    "source_id" TEXT,
    "performed_action_id" TEXT,
    "raw_summary" TEXT,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISOPSuggestion" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "estimated_impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback_note" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "created_date" TEXT NOT NULL DEFAULT '',
    "updated_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AISOPSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_client_id_key" ON "Client"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "CallRecording_session_id_idx" ON "CallRecording"("session_id");

-- CreateIndex
CREATE INDEX "CallRecording_verification_status_idx" ON "CallRecording"("verification_status");

-- CreateIndex
CREATE INDEX "CallRecording_analysis_status_idx" ON "CallRecording"("analysis_status");

-- CreateIndex
CREATE INDEX "Conversation_session_id_idx" ON "Conversation"("session_id");

-- CreateIndex
CREATE INDEX "Conversation_client_id_idx" ON "Conversation"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "Email_message_id_key" ON "Email"("message_id");

-- CreateIndex
CREATE INDEX "Email_from_email_idx" ON "Email"("from_email");

-- CreateIndex
CREATE INDEX "Email_triage_category_idx" ON "Email"("triage_category");

-- CreateIndex
CREATE INDEX "Escalation_session_id_idx" ON "Escalation"("session_id");

-- CreateIndex
CREATE INDEX "Escalation_status_idx" ON "Escalation"("status");

-- CreateIndex
CREATE INDEX "FAQ_category_idx" ON "FAQ"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Margin_client_id_key" ON "Margin"("client_id");

-- CreateIndex
CREATE INDEX "Orders_client_id_idx" ON "Orders"("client_id");

-- CreateIndex
CREATE INDEX "Orders_order_id_idx" ON "Orders"("order_id");

-- CreateIndex
CREATE INDEX "PerformedAction_recording_id_idx" ON "PerformedAction"("recording_id");

-- CreateIndex
CREATE INDEX "PerformedAction_session_id_idx" ON "PerformedAction"("session_id");

-- CreateIndex
CREATE INDEX "Portfolio_client_id_idx" ON "Portfolio"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticket_id_key" ON "Ticket"("ticket_id");

-- CreateIndex
CREATE INDEX "Ticket_source_id_idx" ON "Ticket"("source_id");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

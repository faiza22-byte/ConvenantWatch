import mongoose from "mongoose";

/* =========================
   DASHBOARD COVENANTS
========================= */

const covenantSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    value: Number,
    threshold: Number,
    type: {
      type: String,
      enum: ["MAX", "MIN"],
    },
    status: {
      type: String,
      enum: ["PASS", "WARNING", "BREACH"],
    },
    headroom: String,
    projectedBreachDays: Number,
    breachAmount: String,

    history: [
      {
        month: String,
        value: Number,
      },
    ],

    projection: [
      {
        month: String,
        value: Number,
      },
    ],
  },
  { _id: false }
);

/* =========================
   ALERTS
========================= */

const alertSchema = new mongoose.Schema(
{
  id: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  covenantName: String,
  status: {
    type: String,
    enum: ["PASS", "WARNING", "BREACH"],
  },
  value: Number,
  acknowledged: Boolean,
},
{ _id: false }
);

// IMPORTANT: prevent duplicates globally
alertSchema.index({ id: 1 }, { unique: true });

/* =========================
   LOAN AGREEMENT FORMULAS
========================= */

const formulaSchema = new mongoose.Schema(
  {
    name: String,

    formula: String,

    threshold: Number,

    operator: String,

    unit: String,

    description: String,

    needsReview: {
      type: Boolean,
      default: false,
    },

    requiredAccounts: [
      {
        agreementTerm: String,
        mappedField: String,
      },
    ],
  },
  { _id: false }
);

/* =========================
   COMPUTED RESULTS
========================= */

const covenantResultSchema = new mongoose.Schema(
  {
    id: String,

    name: String,

    value: Number,

    formulaUsed: String,

    status: {
      type: String,
      enum: ["PASS", "WARNING", "BREACH"],
    },

    mapping: mongoose.Schema.Types.Mixed,

    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* =========================
   COMPANY
========================= */

const companySchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    lastSync: {
      type: String,
      default: "Just now",
    },

    industry: {
      type: String,
      default: "",
    },

    financials: {
      netIncome: String,
      interestExpense: String,
      ebitda: String,
      totalDebt: String,
      currentAssets: String,
      currentLiabilities: String,
      cash: String,
    },

    covenants: [covenantSchema],

    alerts: [alertSchema],

    covenantResults: [covenantResultSchema],

    /* =========================
       QUICKBOOKS
    ========================= */

    quickbooks: {
      connected: {
        type: Boolean,
        default: false,
      },

      realmId: String,

      refreshTokenEncrypted: String,

      connectedAt: String,

      lastSyncError: String,

      syncedAt: String,

      figures: mongoose.Schema.Types.Mixed,

      ratios: mongoose.Schema.Types.Mixed,

      rawLineCounts: mongoose.Schema.Types.Mixed,

      reportLines: mongoose.Schema.Types.Mixed,
    },

    /* =========================
       LOAN AGREEMENT
    ========================= */

    loanAgreement: {
      sourceFileName: String,

      parsedAt: String,

      report: {
        title: String,

        referenceId: String,

        summary: String,

        sections: [
          {
            heading: String,
            content: String,
          },
        ],
      },

      chromaCollectionName: String,

      chunkCount: Number,

      formulas: [formulaSchema],
    },
  },
  {
    timestamps: true,
  }
);

export const Company = mongoose.model(
  "Company",
  companySchema
);
/**
 * Inventory Item Model
 * Phase 7–8: Store Management & Department Distribution
 * Tracks items in the university store after goods receipt.
 */
const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  itemCode: { type: String, unique: true },

  description: { type: String, required: true },
  category: { type: String, enum: ['Goods', 'Equipment', 'Consumables', 'Furniture', 'IT', 'Lab', 'Other'] },
  unit: String,
  specifications: String,

  // Stock levels
  quantityOnHand: { type: Number, default: 0 },
  minimumStockLevel: { type: Number, default: 0 },
  location: String,          // Storage location in store
  binNumber: String,

  // Valuation
  unitCost: Number,
  totalValue: Number,

  // Source tracking
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  status: { type: String, enum: ['active', 'low_stock', 'out_of_stock', 'discontinued'], default: 'active' },

  lastReceivedAt: Date,
  lastIssuedAt: Date,
  // Transaction / Audit Ledger
  transactions: [{
    type: { type: String, enum: ['receipt', 'issuance', 'adjustment'], required: true },
    quantity: { type: Number, required: true },
    previousQty: Number,
    newQty: Number,
    referenceNumber: String,
    reason: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

inventoryItemSchema.index({ tenantId: 1, status: 1 });
inventoryItemSchema.index({ tenantId: 1, category: 1 });

inventoryItemSchema.pre('save', async function () {
  if (!this.itemCode) {
    const count = await mongoose.model('InventoryItem').countDocuments({ tenantId: this.tenantId });
    this.itemCode = `UWU/STK/${String(count + 1).padStart(5, '0')}`;
  }
  this.totalValue = (this.quantityOnHand || 0) * (this.unitCost || 0);
  if (this.quantityOnHand <= 0) this.status = 'out_of_stock';
  else if (this.quantityOnHand <= (this.minimumStockLevel || 0)) this.status = 'low_stock';
  else this.status = 'active';
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

// ─────────────────────────────────────────────────────────
// Goods Receipt Note (GRN) Model
// ─────────────────────────────────────────────────────────
const grnItemSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  description: { type: String, required: true },
  orderedQuantity: Number,
  receivedQuantity: { type: Number, required: true },
  rejectedQuantity: { type: Number, default: 0 },
  unit: String,
  unitCost: Number,
  totalCost: Number,
  inspectionStatus: { type: String, enum: ['pending', 'passed', 'partially_passed', 'failed'], default: 'pending' },
  rejectionReason: String,
  specifications: String,
});

const grnSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  grnNumber: { type: String, unique: true },

  // Linked documents
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Supplier delivery info
  supplierName: String,
  supplierInvoiceNumber: String,
  supplierDeliveryNoteNumber: String,
  deliveryDate: Date,

  // Items received
  items: [grnItemSchema],

  // Inspection
  overallInspectionStatus: {
    type: String,
    enum: ['pending_inspection', 'inspection_in_progress', 'passed', 'partially_passed', 'failed'],
    default: 'pending_inspection',
  },
  inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inspectedAt: Date,
  inspectionNotes: String,

  // Store acceptance
  status: {
    type: String,
    enum: ['draft', 'pending_inspection', 'accepted', 'partially_accepted', 'rejected', 'inventory_updated'],
    default: 'draft',
  },

  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receivedAt: { type: Date, default: Date.now },
  storeLocation: String,

  // Financial totals
  totalReceivedValue: Number,

  notes: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

grnSchema.index({ tenantId: 1, status: 1 });
grnSchema.index({ tenantId: 1, procurementId: 1 });

grnSchema.pre('save', async function () {
  if (!this.grnNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('GRN').countDocuments({ tenantId: this.tenantId });
    this.grnNumber = `UWU/GRN/${year}/${String(count + 1).padStart(4, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.totalCost = (item.receivedQuantity || 0) * (item.unitCost || 0);
    });
    this.totalReceivedValue = this.items.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  }
});

const GRN = mongoose.model('GRN', grnSchema);

// ─────────────────────────────────────────────────────────
// Item Issuance Model
// Phase 8: Department receives items from Store
// ─────────────────────────────────────────────────────────
const issuanceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  issuanceNumber: { type: String, unique: true },

  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },

  requestingDepartment: { type: String, required: true },
  requestingFaculty: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  items: [{
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    description: String,
    issuedQuantity: { type: Number, required: true },
    unit: String,
    unitCost: Number,
    purpose: String,
  }],

  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },     // Store Manager
  issuedAt: Date,

  status: {
    type: String,
    enum: ['requested', 'approved', 'issued', 'received_by_department', 'cancelled'],
    default: 'requested',
  },

  departmentReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  departmentReceivedAt: Date,

  notes: String,
}, {
  timestamps: true,
});

issuanceSchema.index({ tenantId: 1, status: 1 });
issuanceSchema.index({ tenantId: 1, requestingDepartment: 1 });

issuanceSchema.pre('save', async function () {
  if (!this.issuanceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Issuance').countDocuments({ tenantId: this.tenantId });
    this.issuanceNumber = `UWU/ISS/${year}/${String(count + 1).padStart(4, '0')}`;
  }
});

const Issuance = mongoose.model('Issuance', issuanceSchema);

module.exports = { InventoryItem, GRN, Issuance };

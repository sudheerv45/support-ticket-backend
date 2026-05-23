const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true
  },
  isInternal: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    url: String,
    mimeType: String
  }]
}, {
  timestamps: true
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'feature-request', 'bug-report'],
    default: 'general',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed', 'escalated'],
    default: 'open',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  comments: [commentSchema],
  tags: [{
    type: String,
    trim: true
  }],
  aiSummary: {
    type: String,
    default: null
  },
  aiCategory: {
    type: String,
    default: null
  },
  aiConfidence: {
    type: Number,
    default: null,
    min: 0,
    max: 1
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      default: null
    }
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for optimized queries
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ createdBy: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ category: 1, priority: 1 });
ticketSchema.index({ ticketNumber: 'text', title: 'text', description: 'text' });

// Auto-generate ticket number
async function generateTicketNumber() {
  const date = new Date();
  const prefix = `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await mongoose.model('Ticket').countDocuments({
    ticketNumber: { $regex: `^${prefix}` }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    this.ticketNumber = await generateTicketNumber();
  }

  if (this.isModified('status')) {
    if (this.status === 'resolved') {
      this.resolvedAt = new Date();
    } else if (this.status === 'closed') {
      this.closedAt = new Date();
    }
  }

  next();
});

// Virtual for response time
ticketSchema.virtual('responseTime').get(function() {
  if (this.comments && this.comments.length > 0) {
    const firstResponse = this.comments[0].createdAt;
    return Math.round((firstResponse - this.createdAt) / 1000 / 60); // minutes
  }
  return null;
});

// Virtual for resolution time
ticketSchema.virtual('resolutionTime').get(function() {
  if (this.resolvedAt) {
    return Math.round((this.resolvedAt - this.createdAt) / 1000 / 60); // minutes
  }
  return null;
});

module.exports = mongoose.model('Ticket', ticketSchema);

const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Activity = require('../models/Activity');
const aiService = require('./aiService');
const { getEmailQueue, getNotificationQueue } = require('../config/queue');
const { emitTicketUpdate } = require('../config/socket');
const { clearCache } = require('../middleware/cache');
const logger = require('../utils/logger');

class TicketService {
  async createTicket(ticketData, userId) {
    try {
      // AI-powered categorization and priority
      const [categoryResult, priorityResult] = await Promise.all([
        aiService.categorizeTicket(ticketData.title, ticketData.description),
        aiService.suggestPriority(ticketData.title, ticketData.description)
      ]);

      const ticket = await Ticket.create({
        ...ticketData,
        createdBy: userId,
        category: ticketData.category || categoryResult.category,
        priority: ticketData.priority || priorityResult.priority,
        aiCategory: categoryResult.category,
        aiConfidence: categoryResult.confidence
      });

      // Log activity
      await Activity.create({
        ticket: ticket._id,
        user: userId,
        action: 'created',
        details: { aiCategory: categoryResult.category, aiConfidence: categoryResult.confidence }
      });

      // Send notifications
      const user = await User.findById(userId);
      await this.sendNotifications(ticket, user, 'created');

      // Emit real-time update
      emitTicketUpdate(ticket._id.toString(), 'ticket-created', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority
      });

      // Clear cache
      await clearCache('tickets');

      return ticket;
    } catch (error) {
      logger.error('Create ticket error:', error);
      throw error;
    }
  }

  async updateTicket(ticketId, updateData, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const oldStatus = ticket.status;
      const oldAssignedTo = ticket.assignedTo;

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          ticket[key] = updateData[key];
        }
      });

      await ticket.save();

      // Log activity
      const action = oldStatus !== ticket.status ? 'status_changed' : 'updated';
      await Activity.create({
        ticket: ticket._id,
        user: userId,
        action,
        details: {
          oldStatus,
          newStatus: ticket.status,
          oldAssignedTo,
          newAssignedTo: ticket.assignedTo
        }
      });

      // Send notifications
      const user = await User.findById(ticket.createdBy);
      await this.sendNotifications(ticket, user, action);

      // Emit real-time update
      emitTicketUpdate(ticket._id.toString(), 'ticket-updated', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo
      });

      // Clear cache
      await clearCache('tickets');

      return ticket;
    } catch (error) {
      logger.error('Update ticket error:', error);
      throw error;
    }
  }

  async assignTicket(ticketId, agentId, assignedBy) {
    try {
      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        { assignedTo: agentId, status: 'in-progress' },
        { new: true }
      ).populate('createdBy', 'email name');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Log activity
      await Activity.create({
        ticket: ticket._id,
        user: assignedBy,
        action: 'assigned',
        details: { assignedTo: agentId }
      });

      // Send notifications
      const agent = await User.findById(agentId);
      await this.sendNotifications(ticket, ticket.createdBy, 'assigned');

      // Notify agent
      const notificationQueue = getNotificationQueue();
      if (notificationQueue) {
        await notificationQueue.add('agent-assigned', {
          userId: agentId,
          type: 'ticket-assigned',
          message: `You have been assigned ticket ${ticket.ticketNumber}`,
          ticketId: ticket._id
        });
      }

      // Emit real-time update
      emitTicketUpdate(ticket._id.toString(), 'ticket-assigned', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        assignedTo: agentId,
        assignedBy
      });

      await clearCache('tickets');

      return ticket;
    } catch (error) {
      logger.error('Assign ticket error:', error);
      throw error;
    }
  }

  async addComment(ticketId, commentData, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const comment = {
        author: userId,
        content: commentData.content,
        isInternal: commentData.isInternal || false,
        attachments: commentData.attachments || []
      };

      ticket.comments.push(comment);
      await ticket.save();

      // Log activity
      await Activity.create({
        ticket: ticket._id,
        user: userId,
        action: 'commented',
        details: { isInternal: comment.isInternal }
      });

      // Send notifications
      const user = await User.findById(ticket.createdBy);
      if (!comment.isInternal) {
        await this.sendNotifications(ticket, user, 'commented');
      }

      // Emit real-time update
      const addedComment = ticket.comments[ticket.comments.length - 1];
      emitTicketUpdate(ticket._id.toString(), 'ticket-comment', {
        ticketId: ticket._id,
        comment: addedComment
      });

      await clearCache('tickets');

      return ticket;
    } catch (error) {
      logger.error('Add comment error:', error);
      throw error;
    }
  }

  async getTickets(filters, userId, userRole, pagination) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      let query = {};

      // Role-based filtering
      if (userRole === 'user') {
        query.createdBy = userId;
      } else if (userRole === 'agent') {
        query.$or = [
          { assignedTo: userId },
          { assignedTo: null, status: 'open' }
        ];
      }
      // Admin sees all tickets

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.category) query.category = filters.category;
      if (filters.assignedTo) query.assignedTo = filters.assignedTo;

      // Search
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      // Date range
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const [tickets, total] = await Promise.all([
        Ticket.find(query)
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .sort(filters.sortBy || { createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Ticket.countDocuments(query)
      ]);

      return {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get tickets error:', error);
      throw error;
    }
  }

  async getTicketById(ticketId, userId, userRole) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('comments.author', 'name email role');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Check permissions
      if (userRole === 'user' && ticket.createdBy._id.toString() !== userId) {
        throw new Error('Access denied');
      }

      return ticket;
    } catch (error) {
      logger.error('Get ticket by id error:', error);
      throw error;
    }
  }

  async generateSummary(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const result = await aiService.generateTicketSummary(
        ticket.title,
        ticket.description,
        ticket.comments
      );

      if (result.success) {
        ticket.aiSummary = result.summary;
        await ticket.save();
      }

      return result;
    } catch (error) {
      logger.error('Generate summary error:', error);
      throw error;
    }
  }

  async getTicketStats(userId, userRole) {
    try {
      let matchStage = {};
      if (userRole === 'user') {
        matchStage = { createdBy: new mongoose.Types.ObjectId(userId) };
      } else if (userRole === 'agent') {
        matchStage = { assignedTo: new mongoose.Types.ObjectId(userId) };
      }

      const stats = await Ticket.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
        avgResolutionTime: 0
      };
    } catch (error) {
      logger.error('Get ticket stats error:', error);
      throw error;
    }
  }

  async sendNotifications(ticket, user, eventType) {
    try {
      const emailQueue = getEmailQueue();
      const notificationQueue = getNotificationQueue();

      if (emailQueue) {
        await emailQueue.add(`ticket-${eventType}`, {
          to: user.email,
          subject: `Ticket ${eventType}: ${ticket.ticketNumber}`,
          template: `ticket-${eventType}`,
          data: {
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            status: ticket.status
          }
        });
      }

      if (notificationQueue) {
        await notificationQueue.add('user-notification', {
          userId: user._id,
          type: `ticket-${eventType}`,
          message: `Your ticket ${ticket.ticketNumber} has been ${eventType}`,
          ticketId: ticket._id
        });
      }
    } catch (error) {
      logger.error('Notification error:', error);
    }
  }
}

module.exports = new TicketService();

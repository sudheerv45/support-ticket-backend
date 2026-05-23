const ticketService = require('../services/ticketService');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class TicketController {
  async create(req, res, next) {
    try {
      const ticket = await ticketService.createTicket(req.body, req.user.userId);
      return ApiResponse.success(res, ticket, 'Ticket created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        assignedTo: req.query.assignedTo,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || { createdAt: -1 }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await ticketService.getTickets(
        filters,
        req.user.userId,
        req.user.role,
        pagination
      );

      return ApiResponse.paginated(res, result.tickets, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ticket = await ticketService.getTicketById(
        req.params.id,
        req.user.userId,
        req.user.role
      );
      return ApiResponse.success(res, ticket);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const ticket = await ticketService.updateTicket(
        req.params.id,
        req.body,
        req.user.userId
      );
      return ApiResponse.success(res, ticket, 'Ticket updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const { agentId } = req.body;

      // Verify agent exists and has agent/admin role
      const agent = await User.findById(agentId);
      if (!agent || !['admin', 'agent'].includes(agent.role)) {
        return ApiResponse.error(res, 'Invalid agent selected', 400);
      }

      const ticket = await ticketService.assignTicket(
        req.params.id,
        agentId,
        req.user.userId
      );
      return ApiResponse.success(res, ticket, 'Ticket assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const ticket = await ticketService.addComment(
        req.params.id,
        req.body,
        req.user.userId
      );
      return ApiResponse.success(res, ticket, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const ticket = await ticketService.updateTicket(
        req.params.id,
        { status },
        req.user.userId
      );
      return ApiResponse.success(res, ticket, `Ticket status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return ApiResponse.error(res, 'Ticket not found', 404);
      }

      // Only admin or ticket creator can delete
      if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user.userId) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      await Ticket.findByIdAndDelete(req.params.id);
      return ApiResponse.success(res, null, 'Ticket deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await ticketService.getTicketStats(req.user.userId, req.user.role);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async generateSummary(req, res, next) {
    try {
      const result = await ticketService.generateSummary(req.params.id);
      if (!result.success) {
        return ApiResponse.error(res, 'Failed to generate summary', 500);
      }
      return ApiResponse.success(res, { summary: result.summary }, 'Summary generated');
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = ['technical', 'billing', 'general', 'feature-request', 'bug-report'];
      return ApiResponse.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async getPriorities(req, res, next) {
    try {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      return ApiResponse.success(res, priorities);
    } catch (error) {
      next(error);
    }
  }

  async getStatuses(req, res, next) {
    try {
      const statuses = ['open', 'in-progress', 'resolved', 'closed', 'escalated'];
      return ApiResponse.success(res, statuses);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketController();

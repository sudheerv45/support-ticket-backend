const aiService = require('../services/aiService');
const Ticket = require('../models/Ticket');
const ApiResponse = require('../utils/apiResponse');

class AIController {
  async categorize(req, res, next) {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return ApiResponse.error(res, 'Title and description are required', 400);
      }

      const result = await aiService.categorizeTicket(title, description);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suggestPriority(req, res, next) {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return ApiResponse.error(res, 'Title and description are required', 400);
      }

      const result = await aiService.suggestPriority(title, description);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async generateSummary(req, res, next) {
    try {
      const { ticketId } = req.params;
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        return ApiResponse.error(res, 'Ticket not found', 404);
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

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suggestResponse(req, res, next) {
    try {
      const { ticketId } = req.params;
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        return ApiResponse.error(res, 'Ticket not found', 404);
      }

      const result = await aiService.generateSuggestedResponse({
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority
      });

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async analyzeTicket(req, res, next) {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return ApiResponse.error(res, 'Title and description are required', 400);
      }

      const [category, priority, summary] = await Promise.all([
        aiService.categorizeTicket(title, description),
        aiService.suggestPriority(title, description),
        aiService.generateTicketSummary(title, description)
      ]);

      return ApiResponse.success(res, {
        category,
        priority,
        summary
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();

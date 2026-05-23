const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIService {
  /**
   * Generate a summary of ticket content
   */
  async generateTicketSummary(title, description, comments = []) {
    try {
      const commentsText = comments.map(c => c.content).join('\n');
      const prompt = `Summarize the following support ticket in 2-3 sentences:

Title: ${title}
Description: ${description}
${commentsText ? `Comments: ${commentsText}` : ''}

Provide a concise summary that captures the main issue and current status.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful support ticket summarizer. Provide concise, accurate summaries.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.3
      });

      return {
        summary: response.choices[0].message.content.trim(),
        success: true
      };
    } catch (error) {
      logger.error('AI Summary generation failed:', error);
      return {
        summary: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto-categorize ticket based on content
   */
  async categorizeTicket(title, description) {
    try {
      const prompt = `Categorize the following support ticket into one of these categories: technical, billing, general, feature-request, bug-report.

Title: ${title}
Description: ${description}

Respond with ONLY the category name and a confidence score (0-1) in this format: category|confidence
Example: technical|0.95`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a ticket categorization assistant. Respond only with category|confidence format.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 20,
        temperature: 0.1
      });

      const result = response.choices[0].message.content.trim();
      const [category, confidence] = result.split('|');

      const validCategories = ['technical', 'billing', 'general', 'feature-request', 'bug-report'];
      const cleanCategory = validCategories.includes(category?.trim().toLowerCase()) 
        ? category.trim().toLowerCase() 
        : 'general';

      return {
        category: cleanCategory,
        confidence: parseFloat(confidence) || 0.5,
        success: true
      };
    } catch (error) {
      logger.error('AI Categorization failed:', error);
      return {
        category: 'general',
        confidence: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggest priority based on content analysis
   */
  async suggestPriority(title, description) {
    try {
      const prompt = `Analyze the following support ticket and suggest a priority level: low, medium, high, or urgent.

Title: ${title}
Description: ${description}

Consider keywords like: critical, broken, down, urgent, asap, error, bug, payment, security.

Respond with ONLY the priority name and confidence score (0-1) in this format: priority|confidence
Example: high|0.85`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a priority assessment assistant. Respond only with priority|confidence format.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 15,
        temperature: 0.1
      });

      const result = response.choices[0].message.content.trim();
      const [priority, confidence] = result.split('|');

      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      const cleanPriority = validPriorities.includes(priority?.trim().toLowerCase())
        ? priority.trim().toLowerCase()
        : 'medium';

      return {
        priority: cleanPriority,
        confidence: parseFloat(confidence) || 0.5,
        success: true
      };
    } catch (error) {
      logger.error('AI Priority suggestion failed:', error);
      return {
        priority: 'medium',
        confidence: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate suggested response for agent
   */
  async generateSuggestedResponse(ticketContext) {
    try {
      const prompt = `Generate a professional, helpful response to the following support ticket:

Title: ${ticketContext.title}
Description: ${ticketContext.description}
Category: ${ticketContext.category}
Priority: ${ticketContext.priority}

Provide a draft response that addresses the issue professionally.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a customer support agent. Generate professional, empathetic responses.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.4
      });

      return {
        suggestion: response.choices[0].message.content.trim(),
        success: true
      };
    } catch (error) {
      logger.error('AI Response generation failed:', error);
      return {
        suggestion: null,
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AIService();

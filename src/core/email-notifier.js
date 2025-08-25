/**
 * Email Notifier
 * 
 * Sends email notifications for discovered insights
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

export class EmailNotifier {
  constructor(recipientEmail) {
    this.recipientEmail = recipientEmail || process.env.NOTIFICATION_EMAIL;
    this.transporter = null;
    this.initialized = false;
    
    // Email configuration
    this.config = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
    
    // Email templates
    this.templates = {
      insightSubject: 'AI Research: {count} New Insights - {date}',
      dailyDigestSubject: 'Daily Research Digest - {date}',
      breakthroughSubject: '🚨 BREAKTHROUGH DISCOVERY: {topic}'
    };
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    try {
      // Create transporter based on configuration
      if (this.config.auth.user && this.config.auth.pass) {
        this.transporter = nodemailer.createTransport({
          service: this.config.service,
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: this.config.auth
        });
        
        // Verify configuration
        await this.transporter.verify();
        this.initialized = true;
        logger.info('Email notifier initialized successfully');
      } else {
        // Fallback to console logging if no email config
        logger.warn('Email credentials not configured, using console output');
        this.initialized = false;
      }
    } catch (error) {
      logger.error('Failed to initialize email notifier:', error);
      this.initialized = false;
    }
  }

  /**
   * Send insight email
   */
  async sendInsightEmail(data) {
    if (!this.initialized) {
      // Fallback to console output
      this.logEmailToConsole(data);
      return;
    }
    
    try {
      // Convert content to string if it's an object
      const contentStr = typeof data.content === 'string' 
        ? data.content 
        : this.formatContentAsMarkdown(data.content);
      
      const mailOptions = {
        from: `"AI Research System" <${this.config.auth.user}>`,
        to: this.recipientEmail,
        subject: data.subject,
        html: this.formatHTMLEmail(contentStr),
        text: contentStr
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      
    } catch (error) {
      logger.error('Failed to send email:', error);
      // Fallback to console
      this.logEmailToConsole(data);
    }
  }

  /**
   * Send breakthrough notification (high priority)
   */
  async sendBreakthroughNotification(insight, topic) {
    const subject = this.templates.breakthroughSubject.replace('{topic}', topic);
    
    const content = `
# BREAKTHROUGH DISCOVERY

## Topic: ${topic}

## Discovery
${insight.content}

## Significance
- Score: ${insight.score}
- Novelty: ${insight.novelty}
- Actionability: ${insight.actionability}

## Timestamp
${new Date(insight.timestamp).toLocaleString()}

---
This is a high-priority notification for a breakthrough discovery.
`;
    
    await this.sendInsightEmail({
      subject: subject,
      content: content,
      priority: 'high'
    });
  }

  /**
   * Format content object as markdown
   */
  formatContentAsMarkdown(content) {
    let markdown = '';
    
    if (content.title) {
      markdown += `# ${content.title}\n\n`;
    }
    
    if (content.insights && Array.isArray(content.insights)) {
      markdown += '## Insights\n\n';
      content.insights.forEach((insight, index) => {
        markdown += `### ${index + 1}. ${insight.topic}\n`;
        markdown += `${insight.content}\n`;
        markdown += `- Score: ${insight.score}/10\n`;
        markdown += `- Time: ${new Date(insight.timestamp).toLocaleString()}\n\n`;
      });
    }
    
    if (content.summary) {
      markdown += `## Summary\n${content.summary}\n\n`;
    }
    
    if (content.metadata) {
      markdown += '## Metadata\n';
      Object.entries(content.metadata).forEach(([key, value]) => {
        markdown += `- ${key}: ${value}\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Format HTML email
   */
  formatHTMLEmail(markdownContent) {
    // Convert markdown to HTML (simple conversion)
    let html = markdownContent
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/---/g, '<hr>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    h3 {
      color: #7f8c8d;
    }
    hr {
      border: none;
      border-top: 1px solid #ecf0f1;
      margin: 20px 0;
    }
    .insight {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin: 20px 0;
    }
    .score {
      display: inline-block;
      padding: 3px 8px;
      background: #3498db;
      color: white;
      border-radius: 3px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  /**
   * Log email to console (fallback)
   */
  logEmailToConsole(data) {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL NOTIFICATION (Console Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${this.recipientEmail}`);
    console.log(`Subject: ${data.subject}`);
    console.log('-'.repeat(60));
    console.log(data.content);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(stats, topInsights, activeTopics) {
    const date = new Date().toLocaleDateString();
    const subject = this.templates.dailyDigestSubject.replace('{date}', date);
    
    let content = `# Daily Research Digest\n\n`;
    content += `Date: ${date}\n\n`;
    
    content += `## Statistics\n`;
    content += `- Topics Explored: ${stats.totalTopicsExplored}\n`;
    content += `- Insights Discovered: ${stats.totalInsightsDiscovered}\n`;
    content += `- Emails Sent: ${stats.totalEmailsSent}\n`;
    content += `- Active Research Sessions: ${stats.currentActiveTopics}\n\n`;
    
    content += `## Top Insights\n`;
    for (const insight of topInsights) {
      content += `### ${insight.type}\n`;
      content += `${insight.content}\n`;
      content += `Score: ${insight.score} | Topic: ${insight.topic}\n\n`;
    }
    
    content += `## Active Research Topics\n`;
    for (const topic of activeTopics) {
      content += `- ${topic}\n`;
    }
    
    await this.sendInsightEmail({
      subject: subject,
      content: content
    });
  }

  /**
   * Test email configuration
   */
  async testEmail() {
    await this.sendInsightEmail({
      subject: 'Test Email - AI Research System',
      content: '# Test Email\n\nThis is a test email from the AI Research System.\n\nIf you receive this, email notifications are working correctly!'
    });
  }
}

export default EmailNotifier;
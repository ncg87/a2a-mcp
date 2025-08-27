/**
 * Test Email Configuration
 * 
 * Run this after setting up your Gmail app password
 */

import { EmailNotifier } from './src/core/email-notifier.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('\n📧 Testing Email Configuration\n');
  console.log('=' . repeat(60));
  
  // Check if email credentials are configured
  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'xxxx xxxx xxxx xxxx') {
    console.error('❌ EMAIL_PASS not configured in .env file!');
    console.log('\nPlease follow these steps:');
    console.log('1. Go to https://myaccount.google.com/apppasswords');
    console.log('2. Generate an app password for Mail');
    console.log('3. Update EMAIL_PASS in your .env file');
    console.log('4. Remove spaces from the password');
    return;
  }
  
  const emailer = new EmailNotifier();
  
  try {
    await emailer.initialize();
    console.log('✅ Email system initialized');
    
    // Send test email
    console.log('\n📤 Sending test email to:', process.env.EMAIL_TO);
    
    await emailer.sendInsightEmail({
      subject: '🧪 AI Research System - Test Email',
      content: {
        title: 'Email Configuration Successful!',
        insights: [
          {
            topic: 'System Status',
            content: 'Your 24/7 AI Research System email notifications are working correctly.',
            score: 10,
            timestamp: new Date().toISOString()
          },
          {
            topic: 'Next Steps',
            content: 'You can now run the autonomous research system with: npm run research',
            score: 9,
            timestamp: new Date().toISOString()
          }
        ],
        summary: 'The email system is configured and ready to send you AI research discoveries.',
        metadata: {
          testTime: new Date().toISOString(),
          systemVersion: '1.0.0'
        }
      }
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('\n💡 Check your inbox at:', process.env.EMAIL_TO);
    console.log('   (May be in spam folder on first send)');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔐 Authentication Issue:');
      console.log('1. Make sure 2-Step Verification is enabled');
      console.log('2. Use an App Password, not your regular password');
      console.log('3. Remove any spaces from the app password');
    } else if (error.message.includes('self signed certificate')) {
      console.log('\n🔒 Security Issue:');
      console.log('Try setting EMAIL_SECURE=true in .env');
    }
  }
}

// Run test
testEmail().catch(console.error);
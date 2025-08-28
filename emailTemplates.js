const nodemailer = require('nodemailer');

// Email templates configuration
const emailTemplates = {
  // Account Registration Confirmation Template
  registration: {
    subject: 'Welcome and account confirmed',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Our Store</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Our Store!</h1>
        </div>
        <div class="content">
          <p>Hi {{customerName}},</p>
          <p>Thank you for creating an account with us. Your account has been successfully confirmed.</p>
          <p>You can now log in to your account and start shopping.</p>
          <p><a href="{{loginLink}}" class="button">Log In to Your Account</a></p>
          <p>If you have any questions or need assistance, feel free to contact our support team.</p>
          <p>Thank you for choosing us!</p>
        </div>
        <div class="footer">
          <p>&copy; 2023 Our Store. All rights reserved.</p>
          <p>This email was sent to {{customerEmail}}.</p>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Welcome to Our Store!
      
      Hi {{customerName}},
      
      Thank you for creating an account with us. Your account has been successfully confirmed.
      
      You can now log in to your account and start shopping.
      
      Log in here: {{loginLink}}
      
      If you have any questions or need assistance, feel free to contact our support team.
      
      Thank you for choosing us!
      
      © 2023 Our Store. All rights reserved.
      This email was sent to {{customerEmail}}.
    `
  },
  
  // Order Confirmation Template
  orderConfirmation: {
    subject: 'Your order #{{orderNumber}} is confirmed',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 5px 5px;
          }
          .order-summary {
            margin: 20px 0;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
          }
          .order-summary table {
            width: 100%;
            border-collapse: collapse;
          }
          .order-summary th, .order-summary td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
          }
          .order-summary th {
            background-color: #f8f9fa;
          }
          .total-row {
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Hi {{customerName}},</p>
          <p>Thank you for your order! We've received it and will begin processing it right away.</p>
          
          <div class="order-summary">
            <h2>Order Summary</h2>
            <p><strong>Order Number:</strong> #{{orderNumber}}</p>
            <p><strong>Expected Delivery Date:</strong> {{deliveryDate}}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {{productList}}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="2">Total</td>
                  <td>{{totalPrice}}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <p>We'll send you another email when your order ships. You can check the status of your order anytime by logging into your account.</p>
          
          <p>Thank you for shopping with us!</p>
        </div>
        <div class="footer">
          <p>&copy; 2023 Our Store. All rights reserved.</p>
          <p>This email was sent to {{customerEmail}}.</p>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Order Confirmation
      
      Hi {{customerName}},
      
      Thank you for your order! We've received it and will begin processing it right away.
      
      Order Number: #{{orderNumber}}
      Expected Delivery Date: {{deliveryDate}}
      
      Order Summary:
      {{productList}}
      
      Total: {{totalPrice}}
      
      We'll send you another email when your order ships. You can check the status of your order anytime by logging into your account.
      
      Thank you for shopping with us!
      
      © 2023 Our Store. All rights reserved.
      This email was sent to {{customerEmail}}.
    `
  },
  
  // Password Reset Template
  passwordReset: {
    subject: 'Password reset request',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi {{customerName}},</p>
          <p>We received a request to reset the password for your account. If you made this request, please click the button below to set a new password:</p>
          
          <p><a href="{{resetLink}}" class="button">Reset Your Password</a></p>
          
          <div class="warning">
            <p><strong>Important:</strong> This link will expire in 24 hours for security reasons. If you don't reset your password within this time, you'll need to submit a new request.</p>
          </div>
          
          <p>If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
          
          <p>Thank you,</p>
          <p>The Our Store Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2023 Our Store. All rights reserved.</p>
          <p>This email was sent to {{customerEmail}}.</p>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Password Reset Request
      
      Hi {{customerName}},
      
      We received a request to reset the password for your account. If you made this request, please use the link below to set a new password:
      
      Reset Your Password: {{resetLink}}
      
      Important: This link will expire in 24 hours for security reasons. If you don't reset your password within this time, you'll need to submit a new request.
      
      If you did not request a password reset, please ignore this email or contact our support team if you have concerns.
      
      Thank you,
      The Our Store Team
      
      © 2023 Our Store. All rights reserved.
      This email was sent to {{customerEmail}}.
    `
  },
  
  // Promotional / Notification Email Template
  promo: {
    subject: '{{promoTitle}}',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{promoTitle}}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 5px 5px;
          }
          .promo-image {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>{{promoTitle}}</h1>
        </div>
        <div class="content">
          <p>Hi {{customerName}},</p>
          <p>{{promoMessage}}</p>
          
          <img src="{{promoImage}}" alt="{{promoTitle}}" class="promo-image">
          
          <p>{{promoDetails}}</p>
          
          <p><a href="{{promoLink}}" class="button">{{promoCTA}}</a></p>
          
          <p>Don't miss out on this special offer! This promotion is valid until {{promoExpiry}}.</p>
          
          <p>Thank you for being a valued customer!</p>
        </div>
        <div class="footer">
          <p>&copy; 2023 Our Store. All rights reserved.</p>
          <p>This email was sent to {{customerEmail}}.</p>
          <p>If you no longer wish to receive these emails, you can <a href="{{unsubscribeLink}}">unsubscribe here</a>.</p>
        </div>
      </body>
      </html>
    `,
    textBody: `
      {{promoTitle}}
      
      Hi {{customerName}},
      
      {{promoMessage}}
      
      {{promoDetails}}
      
      {{promoCTA}}: {{promoLink}}
      
      Don't miss out on this special offer! This promotion is valid until {{promoExpiry}}.
      
      Thank you for being a valued customer!
      
      © 2023 Our Store. All rights reserved.
      This email was sent to {{customerEmail}}.
      If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribeLink}}
    `
  }
};

// Create a reusable function to send emails
const sendEmail = async (to, templateName, data) => {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
      return { success: false, error: 'Email service not configured' };
    }

    // Get the template
    const template = emailTemplates[templateName];
    if (!template) {
      console.error(`Email template "${templateName}" not found.`);
      return { success: false, error: 'Template not found' };
    }

    // Replace placeholders with actual data
    let subject = template.subject;
    let htmlBody = template.htmlBody;
    let textBody = template.textBody;

    // Replace all placeholders in the template
    for (const key in data) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, data[key]);
      htmlBody = htmlBody.replace(placeholder, data[key]);
      textBody = textBody.replace(placeholder, data[key]);
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Set up email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlBody,
      text: textBody
    };

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Export the templates and the sendEmail function
module.exports = {
  templates: emailTemplates,
  sendEmail
};
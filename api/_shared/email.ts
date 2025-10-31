import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set, skipping email send");
    console.log("[EMAIL] Would send:", options);
    return;
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log("[EMAIL] Email sent successfully to:", options.to);
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    throw error;
  }
}

export function generateVerificationEmailHtml(verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to bottom right, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Notebookr</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Thanks for signing up! Please verify your email address to get started.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all; margin: 10px 0;">${verificationUrl}</p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link will expire in 24 hours.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>This email was sent from Notebookr. If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}


import { Resend } from 'resend';

// Initialize Resend only if API key is present (avoid build-time errors)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Password reset email not sent to:', email);
    return;
  }

  // Don't await to prevent timing attacks that reveal valid emails
  void resend.emails.send({
    from: process.env.EMAIL_FROM || 'Internship OS <onboarding@resend.dev>',
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Reset your password</h1>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}

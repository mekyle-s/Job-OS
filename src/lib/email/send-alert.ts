import { Resend } from 'resend';
import { HighFitAlertEmail } from './templates/high-fit-alert';

interface Role {
  title: string;
  company: string;
  fitBand: string;
  url: string;
}

// Lazy-init Resend client (per DEV-014 pattern - avoid build-time errors)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * Send high-fit role alert email to user
 */
export async function sendHighFitAlert(
  userEmail: string,
  userName: string,
  roles: Role[]
): Promise<{ data: unknown; error: unknown }> {
  const resend = getResendClient();

  if (!resend) {
    console.warn('RESEND_API_KEY not configured. High-fit alert email not sent to:', userEmail);
    return { data: null, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Internship OS <onboarding@resend.dev>',
      to: userEmail,
      subject: `${roles.length} New High-Fit Role${roles.length > 1 ? 's' : ''} Available`,
      react: HighFitAlertEmail({ userName, roles }),
    });

    return { data, error };
  } catch (error) {
    console.error('Failed to send high-fit alert email:', error);
    return { data: null, error };
  }
}

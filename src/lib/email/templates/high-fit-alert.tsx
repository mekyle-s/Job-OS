import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
} from '@react-email/components';

interface Role {
  title: string;
  company: string;
  fitBand: string;
  url: string;
}

interface HighFitAlertEmailProps {
  userName: string;
  roles: Role[];
}

export function HighFitAlertEmail({ userName, roles }: HighFitAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New High-Fit Roles for {userName}</Heading>

          <Text style={text}>
            {roles.length} new role{roles.length > 1 ? 's' : ''} that match your profile:
          </Text>

          {roles.map((role, index) => (
            <Section key={index} style={roleCard}>
              <Heading as="h2" style={roleTitle}>
                {role.title}
              </Heading>
              <Text style={roleCompany}>{role.company}</Text>
              <Text style={fitBadge(role.fitBand)}>
                {role.fitBand === 'high' ? '🟢 High Fit (80-100%)' : '🟡 Medium Fit (60-80%)'}
              </Text>
              <Button href={role.url} style={button}>
                View Role Brief
              </Button>
            </Section>
          ))}

          <Text style={footer}>
            You received this because you have active criteria. Manage your alerts in Internship OS.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
  padding: '0 20px',
  color: '#1f2937',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#4b5563',
  padding: '0 20px',
};

const roleCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '20px',
  padding: '20px',
  border: '1px solid #e5e7eb',
};

const roleTitle = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  color: '#1f2937',
};

const roleCompany = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 12px 0',
};

const fitBadge = (fitBand: string) => ({
  fontSize: '14px',
  fontWeight: '500',
  color: fitBand === 'high' ? '#059669' : '#d97706',
  backgroundColor: fitBand === 'high' ? '#d1fae5' : '#fef3c7',
  padding: '4px 12px',
  borderRadius: '12px',
  display: 'inline-block',
  margin: '0 0 16px 0',
});

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  lineHeight: '20px',
};

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  marginTop: '32px',
  padding: '0 20px',
};

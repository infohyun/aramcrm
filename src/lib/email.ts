// 이메일 발송 유틸리티
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: from || process.env.SMTP_FROM || 'noreply@aramhuvis.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// 이메일 템플릿 헬퍼
export function wrapEmailTemplate(content: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Noto Sans KR', sans-serif;">
      <div style="background: #0a0a0a; padding: 20px; text-align: center;">
        <h1 style="color: white; font-size: 18px; margin: 0;">아람휴비스</h1>
      </div>
      <div style="padding: 30px; background: white;">
        ${content}
      </div>
      <div style="padding: 20px; background: #f7f7f8; text-align: center; font-size: 12px; color: #888;">
        <p>&copy; ${new Date().getFullYear()} 아람휴비스. All rights reserved.</p>
      </div>
    </div>
  `;
}

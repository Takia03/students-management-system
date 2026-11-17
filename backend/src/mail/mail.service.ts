import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async sendImportedStudentCredentials(
    to: string,
    name: string,
    password: string,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM');
    const loginUrl = this.config.get<string>('APP_LOGIN_URL');

    if (!from || !loginUrl || !this.config.get<string>('SMTP_HOST')) {
      throw new Error(
        'SMTP_HOST, SMTP_FROM, and APP_LOGIN_URL must be configured.',
      );
    }

    const safeName = name.replace(/[<>&"]/g, '');
    const safeEmail = to.replace(/[<>&"]/g, '');
    const safePassword = password.replace(/[<>&"]/g, '');
    const safeLoginUrl = loginUrl.replace(/[<>&"]/g, '');

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Welcome to the Student management system',
      text: [
        `Welcome${safeName ? `, ${safeName}` : ''}!`,
        '',
        `Email: ${to}`,
        `Temporary password: ${password}`,
        '',
        `Log in here: ${loginUrl}`,
        'After logging in, change your password using forget password',
      ].join('\n'),

      html: `
      <p>Welcome${safeName ? `, ${safeName}` : ''}!</p>
        <p>Your account has been created.</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Temporary password:</strong> ${safePassword}</p>
        <p><a href="${safeLoginUrl}">Log in to the application</a></p>
        <p>After logging in, change your password using forget password.</p>
        `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const from = this.config.get<string>('SMTP_FROM');
  const frontendUrl = this.config.get<string>('FRONTEND_RESET_URL');

  if (!from || !frontendUrl || !this.config.get<string>('SMTP_HOST')) {
    throw new Error(
      'SMTP_HOST, SMTP_FROM, and FRONTEND_RESET_URL must be configured.',
    );
  }

  const resetUrl = new URL('/reset-password', frontendUrl);
  resetUrl.searchParams.set('token', token);

  await this.transporter.sendMail({
    from,
    to,
    subject: 'Reset your password',
    text: [
      'We received a request to reset your password.',
      '',
      `Reset your password here: ${resetUrl.toString()}`,
      '',
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl.toString()}">Reset your password</a></p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `,
  });
}
}

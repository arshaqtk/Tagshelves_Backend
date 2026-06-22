import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"TagShelves" <noreply@tagshelves.com>`;

  // Print a highly visible console banner for local development
  console.log(`
==================================================
   EMAIL VERIFICATION OTP
   Recipient: ${email}
   OTP Code:  ${otp}
   Expires:   In 15 minutes
==================================================
  `);

  // If SMTP configurations are missing, we skip nodemailer sending and just log to console.
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("[Mail Service] SMTP credentials not fully configured. Email sending skipped. OTP logged above.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpFrom,
      to: email,
      subject: "Verify Your TagShelves Account",
      text: `Your TagShelves registration verification code is: ${otp}. It will expire in 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Welcome to TagShelves!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">Thank you for registering. Please use the following One-Time Password (OTP) to verify your account and complete your registration:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">This code will expire in 15 minutes. If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Mail Service] Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`[Mail Service] Failed to send email to ${email}:`, error);
  }
}

export async function sendResetPasswordEmail(email: string, otp: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"TagShelves" <noreply@tagshelves.com>`;

  // Print a highly visible console banner for local development
  console.log(`
==================================================
   PASSWORD RESET OTP
   Recipient: ${email}
   OTP Code:  ${otp}
   Expires:   In 15 minutes
==================================================
  `);

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("[Mail Service] SMTP credentials not fully configured. Email sending skipped. Reset OTP logged above.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpFrom,
      to: email,
      subject: "Reset Your TagShelves Password",
      text: `Your TagShelves password reset verification code is: ${otp}. It will expire in 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">We received a request to reset your TagShelves account password. Please use the following One-Time Password (OTP) to verify your identity and reset your password:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #b91c1c; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">This code will expire in 15 minutes. If you did not request this password reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Mail Service] Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error(`[Mail Service] Failed to send password reset email to ${email}:`, error);
  }
}

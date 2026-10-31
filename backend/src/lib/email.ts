import nodemailer from "nodemailer";
import { mkdir, appendFile } from "fs/promises";
import path from "path";

const FROM = process.env.EMAIL_FROM || "RYDEX <no-reply@rydex.app>";

function transport() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return null;
}

async function writeDevMail(to: string, subject: string, html: string) {
  try {
    const dir = path.join(process.cwd(), ".mail-outbox");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "mail.log");
    await appendFile(
      file,
      `\n\n=== ${new Date().toISOString()} ===\nTO: ${to}\nSUBJECT: ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
  } catch (error) {
    console.warn("[email] could not write dev outbox", error);
  }
  console.info(`[email:dev] to=${to} subject="${subject}" (see .mail-outbox/mail.log)`);
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = transport();
  if (!transporter) {
    await writeDevMail(to, subject, html);
    return { delivered: false, dev: true };
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
  return { delivered: true, dev: false };
}

const shell = (title: string, body: string) => `
<!doctype html><html><body style="margin:0;background:#f4f4f1;font-family:Inter,Arial,sans-serif;color:#0b0b0b">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:32px 12px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e8e8e4">
<tr><td style="background:#0b0b0b;padding:24px 32px"><div style="font-weight:800;letter-spacing:6px;color:#fff;font-size:20px">RYDEX</div></td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eee;color:#777;font-size:12px">RYDEX Mobility · Book any vehicle, your way.</td></tr>
</table></td></tr></table></body></html>`;

export async function sendOtpEmail(to: string, name: string, otp: string) {
  return sendEmail(
    to,
    `${otp} is your RYDEX verification code`,
    shell(
      `Verify your email, ${name.split(" ")[0]}`,
      `<p style="color:#555;line-height:1.6">Use the code below to finish creating your RYDEX account. It expires in 10 minutes.</p>
      <div style="margin:24px 0;padding:18px;text-align:center;background:#f4f4f1;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:12px">${otp}</div>
      <p style="color:#888;font-size:13px">If you did not create a RYDEX account, you can safely ignore this email.</p>`,
    ),
  );
}

export async function sendResetOtpEmail(to: string, otp: string) {
  return sendEmail(
    to,
    `${otp} is your RYDEX password reset code`,
    shell(
      "Reset your password",
      `<p style="color:#555;line-height:1.6">Use this one-time code to reset your password. It expires in 10 minutes.</p>
      <div style="margin:24px 0;padding:18px;text-align:center;background:#f4f4f1;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:12px">${otp}</div>`,
    ),
  );
}

export async function sendRideOtpEmail(
  to: string,
  name: string,
  type: "pickup" | "drop",
  otp: string,
  vehicleName: string,
) {
  return sendEmail(
    to,
    `Your RYDEX ${type} OTP: ${otp}`,
    shell(
      `${type === "pickup" ? "Pickup" : "Drop"} verification`,
      `<p style="color:#555;line-height:1.6">Hi ${name.split(" ")[0]}, share this 4-digit code with your partner for <strong>${vehicleName}</strong> to ${type === "pickup" ? "start your ride" : "complete your ride"}. Do not share it before you are ready.</p>
      <div style="margin:24px 0;padding:18px;text-align:center;background:#f4f4f1;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:12px">${otp}</div>`,
    ),
  );
}

export async function sendBookingStatusEmail(
  to: string,
  name: string,
  title: string,
  message: string,
  cta?: { label: string; url: string },
) {
  return sendEmail(
    to,
    `RYDEX · ${title}`,
    shell(
      title,
      `<p style="color:#555;line-height:1.6">Hi ${name.split(" ")[0]}, ${message}</p>
      ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:18px;background:#0b0b0b;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;font-size:14px">${cta.label}</a>` : ""}`,
    ),
  );
}

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const to = process.env.EMAIL_USER || "support@rydex.app";
  return sendEmail(
    to,
    `[RYDEX contact] ${data.subject}`,
    shell(
      "New contact message",
      `<p><strong>From:</strong> ${data.name} &lt;${data.email}&gt;</p><p style="white-space:pre-wrap;line-height:1.6">${data.message}</p>`,
    ),
  );
}

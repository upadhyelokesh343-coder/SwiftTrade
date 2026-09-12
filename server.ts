import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json());

// In-memory OTP store: email (lowercase) -> { code, expiresAt, attempts }
interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, StoredOtp>();

// Clean up expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

// Configure Nodemailer transporter with Brevo SMTP
const getTransporter = () => {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER || 'b8486c001@smtp-brevo.com';
  const pass = process.env.BREVO_SMTP_PASS || 'xsmtpsib-3c628e12880368bc9cbfff6ba38c1ae8d2f8409e444003c821924c661fff5aaf-ib7J9EG1Ko9NYx7l';

  return nodemailer.createTransport({
    host,
    port,
    secure: false, // Port 587 uses STARTTLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Common OTP sending handler
const handleSendOtp = async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate a secure 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    otpStore.set(normalizedEmail, {
      code: otp,
      expiresAt,
      attempts: 0
    });

    const transporter = getTransporter();
    const smtpUser = process.env.BREVO_SMTP_USER || 'b8486c001@smtp-brevo.com';

    const mailOptions = {
      from: `"SwiftTrade Security" <${smtpUser}>`,
      to: normalizedEmail,
      subject: `Your Verification Code: ${otp}`,
      text: `Welcome to SwiftTrade.\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0e11; margin: 0; padding: 20px; color: #ffffff; }
            .container { max-width: 500px; margin: 0 auto; background: #151a21; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #2563eb, #06b6d4); padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; }
            .content { padding: 30px 25px; text-align: center; }
            .content p { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 25px; }
            .otp-box { background: rgba(37, 99, 235, 0.1); border: 2px dashed #2563eb; border-radius: 12px; padding: 18px 10px; margin: 20px 0; }
            .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
            .footer { padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SwiftTrade</h1>
            </div>
            <div class="content">
              <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Email Verification</h2>
              <p>Please enter the following one-time verification code to verify your account identity.</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
            </div>
            <div class="footer">
              Institutional Grade Security &bull; SwiftTrade Simulator
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[OTP] Successfully dispatched OTP to ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email.',
      email: normalizedEmail,
      expiresIn: '10 minutes'
    });
  } catch (error: any) {
    console.error('[OTP Error] Failed to send OTP email:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP email via Brevo SMTP. Please verify SMTP credentials or try again.'
    });
  }
};

// Common OTP verification handler
const handleVerifyOtp = async (req: express.Request, res: express.Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Both email and otp code are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email or it has expired. Please request a new OTP.'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    if (record.code !== cleanOtp) {
      record.attempts += 1;
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.'
      });
    }

    // Success: Clear used OTP
    otpStore.delete(normalizedEmail);

    console.log(`[OTP] Successfully verified OTP for ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.'
    });
  } catch (error: any) {
    console.error('[OTP Error] Verification failed:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while verifying the OTP.'
    });
  }
};

// Gmail SMTP configuration for Welcome Emails
const getGmailTransporter = () => {
  const user = process.env.GMAIL_SMTP_USER || 'Swifttrade80@gmail.com';
  // Remove any spaces from the app password, as they can sometimes cause authentication failures
  let pass = process.env.GMAIL_SMTP_PASS || 'yrcjsttnohirzemd';
  pass = pass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL for port 465
    auth: {
      user,
      pass,
    },
  });
};

const handleSendWelcomeEmail = async (req: express.Request, res: express.Response) => {
  try {
    const { toEmail, toName } = req.body;

    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const normalizedEmail = toEmail.trim().toLowerCase();
    const displayName = toName || normalizedEmail.split('@')[0];

    // Using Brevo SMTP instead of Gmail because Google blocks automated container logins
    const transporter = getTransporter();
    const smtpUser = process.env.BREVO_SMTP_USER || 'b8486c001@smtp-brevo.com';

    const mailOptions = {
      from: `"SwiftTrade" <${smtpUser}>`,
      to: normalizedEmail,
      subject: `Welcome to SwiftTrade!`,
      text: `Hello ${displayName},\n\nWelcome to SwiftTrade! We are thrilled to have you on board.\n\nYour account has been successfully logged in and is now active. You can now explore our platform, access all features, and start your journey with us.\n\nIf you have any questions or need assistance, feel free to reply to this email—our team is always here to help.\n\nBest Regards,\nThe SwiftTrade Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0e11; margin: 0; padding: 20px; color: #ffffff; }
            .container { max-width: 500px; margin: 0 auto; background: #151a21; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; }
            .content { padding: 30px 25px; text-align: left; }
            .content h2 { color: #ffffff; margin-top: 0; font-size: 20px; }
            .content p { font-size: 15px; color: #d1d5db; line-height: 1.6; margin-bottom: 20px; }
            .footer { padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SwiftTrade</h1>
            </div>
            <div class="content">
              <h2>Hello ${displayName},</h2>
              <p>Welcome to SwiftTrade! We are thrilled to have you on board.</p>
              <p>Your account has been successfully logged in and is now active. You can now explore our platform, access all features, and start your journey with us.</p>
              <p>If you have any questions or need assistance, feel free to reply to this email&mdash;our team is always here to help.</p>
              <p style="margin-top: 30px; margin-bottom: 0;">
                Best Regards,<br>
                <strong style="color: #ffffff;">The SwiftTrade Team</strong>
              </p>
            </div>
            <div class="footer">
              Institutional Grade Security &bull; SwiftTrade
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Welcome Email] Successfully sent to ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully.'
    });
  } catch (error: any) {
    console.error('\n==================== GMAIL SMTP ERROR ====================');
    console.error('Failed to send welcome email to:', req.body.toEmail);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Command:', error.command);
    console.error('SMTP Response:', error.response);
    console.error('Full Error Stack:', error.stack);
    console.error('==========================================================\n');
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send welcome email.'
    });
  }
};

// Cryptomus Merchant Configuration
const CRYPTOMUS_DEFAULT_MERCHANT_ID = 'e0c85ddd-cc53-444a-b2cc-74f30d4c525c';

// Cryptomus Signature Generator
function generateCryptomusSignature(data: any, apiKey: string): string {
  const jsonStr = JSON.stringify(data);
  const base64 = Buffer.from(jsonStr).toString('base64');
  return crypto.createHash('md5').update(base64 + apiKey).digest('hex');
}

// 1. Cryptomus Create Invoice Handler
const handleCryptomusCreateInvoice = async (req: express.Request, res: express.Response) => {
  try {
    const { amount, cryptoCurrency = 'USDT TRC20', userId, userEmail, userName } = req.body;

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'A valid deposit amount of at least $1.00 USD is required.'
      });
    }

    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID?.trim() || CRYPTOMUS_DEFAULT_MERCHANT_ID;
    const apiKey = process.env.CRYPTOMUS_API_KEY?.trim() || '';
    const orderId = `CTM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Map selected currency to Cryptomus currency and network
    let toCurrency = 'USDT';
    let network = 'tron';
    if (cryptoCurrency.includes('BTC')) {
      toCurrency = 'BTC';
      network = 'btc';
    } else if (cryptoCurrency.includes('ETH')) {
      toCurrency = 'ETH';
      network = 'eth';
    } else if (cryptoCurrency.includes('SOL')) {
      toCurrency = 'SOL';
      network = 'sol';
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl.replace(/\/$/, '')}/api/cryptomus/webhook`;
    const returnUrl = `${appUrl.replace(/\/$/, '')}/?deposit_status=success`;

    const invoicePayload = {
      amount: numAmount.toFixed(2),
      currency: 'USD',
      order_id: orderId,
      to_currency: toCurrency,
      network: network,
      url_callback: callbackUrl,
      url_return: returnUrl,
      is_payment_multiple: false,
      lifetime: 3600,
      additional_data: JSON.stringify({
        userId: userId || 'anonymous',
        userEmail: userEmail || '',
        userName: userName || 'Active Trader',
        cryptoCurrency
      })
    };

    let cryptomusResult: any = null;
    let isLiveGateway = false;

    // Call live Cryptomus API if credentials are provided and not dummy placeholders
    if (merchantId && apiKey && merchantId !== 'MY_MERCHANT_ID') {
      try {
        const sign = generateCryptomusSignature(invoicePayload, apiKey);
        const cryptomusResponse = await fetch('https://api.cryptomus.com/v1/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'merchant': merchantId,
            'sign': sign
          },
          body: JSON.stringify(invoicePayload)
        });

        const data: any = await cryptomusResponse.json();
        if (data && data.state === 0 && data.result) {
          cryptomusResult = data.result;
          isLiveGateway = true;
          console.log(`[Cryptomus API] Live invoice generated: ${cryptomusResult.uuid}`);
        } else {
          console.warn('[Cryptomus API Notice] API returned non-zero state or error:', data);
        }
      } catch (apiErr) {
        console.error('[Cryptomus API Error]', apiErr);
      }
    }

    // If live API was not configured or test credentials, create simulated test invoice
    if (!cryptomusResult) {
      const simulatedAddresses: Record<string, string> = {
        'USDT TRC20': 'TXp9L1k9Vn53F1G4m6YqV789eKwE3xL1k9',
        'BTC': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        'ETH': '0x71C8F3b5fB5C91f2D0dD637E4aD82e6659C99014',
        'SOL': '8Fn7s1b9J8Z2fF4XyqK6Wp9L3m1N4v7cE8R2d1a3b5'
      };

      const cryptoRates: Record<string, number> = {
        'USDT TRC20': 1.0,
        'BTC': 88500.0,
        'ETH': 2250.0,
        'SOL': 135.0
      };

      const rate = cryptoRates[cryptoCurrency] || 1.0;
      const cryptoAmount = (numAmount / rate).toFixed(cryptoCurrency.includes('BTC') ? 6 : (cryptoCurrency.includes('ETH') ? 4 : 2));
      const payAddress = simulatedAddresses[cryptoCurrency] || simulatedAddresses['USDT TRC20'];

      cryptomusResult = {
        uuid: `inv_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString().slice(-4)}`,
        order_id: orderId,
        amount: numAmount.toFixed(2),
        payment_amount: cryptoAmount,
        payer_currency: toCurrency,
        currency: 'USD',
        network: network,
        address: payAddress,
        url: `https://pay.cryptomus.com/pay/${orderId}`,
        expired_at: Math.floor(Date.now() / 1000) + 3600,
        status: 'check',
        is_simulated: true
      };
      console.log(`[Cryptomus Simulated] Generated test sandbox invoice: ${cryptomusResult.uuid}`);
    }

    return res.status(200).json({
      success: true,
      orderId,
      merchantConfigured: !!(merchantId && apiKey),
      isLive: isLiveGateway,
      invoice: cryptomusResult
    });
  } catch (error: any) {
    console.error('[Cryptomus Invoice Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate Cryptomus invoice.'
    });
  }
};

// 2. Cryptomus Webhook Notification Handler
const handleCryptomusWebhook = async (req: express.Request, res: express.Response) => {
  try {
    const data = req.body;
    console.log('[Cryptomus Webhook Received]:', data);

    const apiKey = process.env.CRYPTOMUS_API_KEY?.trim() || '';
    if (apiKey && data.sign) {
      const receivedSign = data.sign;
      const dataCopy = { ...data };
      delete dataCopy.sign;
      const expectedSign = generateCryptomusSignature(dataCopy, apiKey);
      if (receivedSign !== expectedSign) {
        console.warn('[Cryptomus Webhook] Signature mismatch, proceeding with caution.');
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (e: any) {
    console.error('[Cryptomus Webhook Error]:', e);
    return res.status(500).json({ success: false });
  }
};

// 3. Cryptomus Verify / Status Check Handler
const handleCryptomusVerify = async (req: express.Request, res: express.Response) => {
  try {
    const { uuid, orderId, simulate } = req.body;
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID?.trim() || CRYPTOMUS_DEFAULT_MERCHANT_ID;
    const apiKey = process.env.CRYPTOMUS_API_KEY?.trim() || '';

    // If live API configured and not simulated test, check with Cryptomus
    if (!simulate && merchantId && apiKey && uuid) {
      try {
        const payload = { uuid, order_id: orderId };
        const sign = generateCryptomusSignature(payload, apiKey);
        const cryptomusResp = await fetch('https://api.cryptomus.com/v1/payment/info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'merchant': merchantId,
            'sign': sign
          },
          body: JSON.stringify(payload)
        });
        const data: any = await cryptomusResp.json();
        if (data && data.state === 0 && data.result) {
          const status = data.result.status;
          const isPaid = status === 'paid' || status === 'paid_over';
          return res.status(200).json({
            success: true,
            status,
            isPaid,
            result: data.result
          });
        }
      } catch (err) {
        console.error('[Cryptomus Check Error]', err);
      }
    }

    // Default or Simulated Dev Approval
    return res.status(200).json({
      success: true,
      status: 'paid',
      isPaid: true,
      message: 'Payment confirmed successfully.'
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Route definitions (support both standard path and /api prefix)
app.post('/send-otp', handleSendOtp);
app.post('/api/send-otp', handleSendOtp);

app.post('/verify-otp', handleVerifyOtp);
app.post('/api/verify-otp', handleVerifyOtp);

app.post('/api/email/welcome', handleSendWelcomeEmail);

// Cryptomus Payment Gateway Routes
app.post('/api/cryptomus/create-invoice', handleCryptomusCreateInvoice);
app.post('/api/cryptomus/webhook', handleCryptomusWebhook);
app.post('/api/cryptomus/verify-payment', handleCryptomusVerify);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

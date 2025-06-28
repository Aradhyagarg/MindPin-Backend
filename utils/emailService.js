import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "Gmail", // Default to Gmail if SERVICE is not set
  auth: {
    user: "rishi.garg0802@gmail.com",
    pass: "cgbcjjbjtevtnikq",
  },
});

// Email template styles (shared across all emails)
const emailStyles = `
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(90deg, #ff6f61, #ff9a76);
      padding: 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
      text-align: center;
      color: #333333;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin: 10px 0;
    }
    .otp {
      display: inline-block;
      background-color: #ff6f61;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 20px;
      font-weight: bold;
      margin: 10px 0;
    }
    .success-icon {
      font-size: 40px;
      color: #28a745;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(90deg, #ff6f61, #ff9a76);
      color: #ffffff;
      padding: 12px 25px;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      background-color: #f4f4f4;
      padding: 15px;
      text-align: center;
      font-size: 14px;
      color: #777777;
    }
    .footer a {
      color: #ff6f61;
      text-decoration: none;
    }
  </style>
`;

// Email template for Password Reset OTP
const sendPasswordResetOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "🔑 Password Reset OTP",
    html: `
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            <div class="otp">${otp}</div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email or contact support.</p>
            <a href="mailto:support@yourwebsite.com" class="button">Contact Support</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
            <p><a href="https://yourwebsite.com">Visit our website</a></p>
          </div>
        </div>
        ${emailStyles}
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password Reset OTP email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending Password Reset OTP email to ${email}:`, error);
    throw new Error("Failed to send OTP email");
  }
};

// Email template for User Registration Success
const sendRegistrationSuccessEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "🎉 Welcome to Your Website!",
    html: `
        <div class="container">
          <div class="header">
            <h1>Welcome, ${name}!</h1>
          </div>
          <div class="content">
            <div class="success-icon">✔</div>
            <p>Congratulations! Your account has been successfully created.</p>
            <p>We're excited to have you on board. Start exploring now!</p>
            <a href="http://localhost:5173/login" class="button">Log In Now</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
            <p><a href="http://localhost:5173">Visit our website</a></p>
          </div>
        </div>
        ${emailStyles}
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Registration Success email sent to ${email}`);
  } catch (error) {
    console.error(
      `Error sending Registration Success email to ${email}:`,
      error
    );
    throw new Error("Failed to send registration success email");
  }
};

// Email template for Password Reset Success
const sendPasswordResetSuccessEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "✅ Password Reset Successful",
    html: `
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <div class="success-icon">✔</div>
            <p>Hello ${name},</p>
            <p>Your password has been successfully reset.</p>
            <p>You can now log in with your new password.</p>
            <a href="https://yourwebsite.com/login" class="button">Log In Now</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
            <p><a href="https://yourwebsite.com">Visit our website</a></p>
          </div>
        </div>
        ${emailStyles}
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password Reset Success email sent to ${email}`);
  } catch (error) {
    console.error(
      `Error sending Password Reset Success email to ${email}:`,
      error
    );
    throw new Error("Failed to send password reset success email");
  }
};

const sendDeletionEmail = async (email, name) => {
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Account Deleted",
      html: `
        <div class="container">
          <div class="header">
            <h1>Account Deleted</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Your Printrest account and all associated data have been permanently deleted.</p>
            <p>We’re sorry to see you go. If you have any feedback, please let us know.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Printrest. All rights reserved.</p>
          </div>
        </div>
      `,
    };
    try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(
          `Error sending Delete User Success email to ${email}:`,
          error
        );
        throw new Error("Failed to send Delete User success email");
      }
  };

const sendDeactivationEmail = async (email, name) => {
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Account Deactivated",
      html: `
        <div class="container">
          <div class="header">
            <h1>Account Deactivated</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Your Printrest account has been temporarily deactivated. Your profile, pins, and other data are now hidden from other users.</p>
            <p>You can reactivate your account by logging in again.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Printrest. All rights reserved.</p>
          </div>
        </div>
      `,
    };
    try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(
          `Error sending Deactivation email to ${email}:`,
          error
        );
        throw new Error("Failed to send Deactivation email");
      }
  };

export {
  sendPasswordResetOTPEmail,
  sendRegistrationSuccessEmail,
  sendPasswordResetSuccessEmail,
  sendDeletionEmail,
  sendDeactivationEmail,
};

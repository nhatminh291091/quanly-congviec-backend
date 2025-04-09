const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const sheetsService = require('../services/sheets/sheetsService');

// Google OAuth client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate auth URL for Google OAuth (redirect login)
const getGoogleAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/spreadsheets'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

// Handle Google OAuth callback (redirect login flow)
const handleGoogleCallback = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    const userRole = await sheetsService.getUserRole(tokens.access_token, email);
    if (!userRole) {
      throw new Error('User not authorized. Email not found in the system.');
    }

    const user = {
      email,
      name: userRole.name,
      role: userRole.role,
      picture: payload.picture
    };

    const token = jwt.sign(
      {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { user, token };
  } catch (error) {
    console.error('Error in Google callback:', error);
    throw error;
  }
};

// ✅ Handle Google One Tap / Popup Login (ID Token login)
const verifyGoogleIdToken = async (idToken) => {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    const userRole = await sheetsService.getUserRole(null, email); // Không cần access_token
    if (!userRole) {
      throw new Error('User not authorized. Email not found in the system.');
    }

    const user = {
      email,
      name: userRole.name,
      role: userRole.role,
      picture: payload.picture
    };

    const token = jwt.sign(
      { user },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { user, token };
  } catch (error) {
    console.error('Error verifying Google ID Token:', error);
    throw error;
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
};

// Refresh Google access token if expired
const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

module.exports = {
  getGoogleAuthUrl,
  handleGoogleCallback,
  verifyGoogleIdToken, // ✅ export thêm hàm này
  verifyToken,
  refreshAccessToken
};

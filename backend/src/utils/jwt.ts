import jwt from 'jsonwebtoken';
import { appConfig } from './config';
import { AuthTokens, JWTPayload, User, UserRole } from '../types';
import { TokenExpiredError, AuthenticationError } from './errors';
import logger from './logger';

export class JWTUtils {
  private static readonly ACCESS_TOKEN_TYPE = 'access';
  private static readonly REFRESH_TOKEN_TYPE = 'refresh';

  public static generateTokens(user: User): AuthTokens {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(
      { ...payload, type: this.ACCESS_TOKEN_TYPE },
      appConfig.jwt.secret,
      { expiresIn: appConfig.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: this.REFRESH_TOKEN_TYPE },
      appConfig.jwt.secret,
      { expiresIn: appConfig.jwt.refreshExpiresIn }
    );

    // Calculate expires_in in seconds
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    };
  }

  public static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as JWTPayload & { type: string };

      if (decoded.type !== this.ACCESS_TOKEN_TYPE) {
        throw new AuthenticationError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token');
      }
      throw error;
    }
  }

  public static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as JWTPayload & { type: string };

      if (decoded.type !== this.REFRESH_TOKEN_TYPE) {
        throw new AuthenticationError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  public static extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  public static generatePasswordResetToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'password_reset',
    };

    return jwt.sign(payload, appConfig.jwt.secret, { expiresIn: '1h' });
  }

  public static verifyPasswordResetToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

      if (decoded.type !== 'password_reset') {
        throw new AuthenticationError('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Password reset token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid password reset token');
      }
      throw error;
    }
  }

  public static generateEmailVerificationToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'email_verification',
    };

    return jwt.sign(payload, appConfig.jwt.secret, { expiresIn: '24h' });
  }

  public static verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

      if (decoded.type !== 'email_verification') {
        throw new AuthenticationError('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Email verification token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid email verification token');
      }
      throw error;
    }
  }

  public static isTokenExpired(token: string): boolean {
    try {
      jwt.verify(token, appConfig.jwt.secret);
      return false;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return true;
      }
      // Other errors mean the token is invalid, not just expired
      return false;
    }
  }

  public static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  public static getTokenRemainingTime(token: string): number {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return 0;
    }

    const now = new Date();
    const remaining = Math.max(0, expiration.getTime() - now.getTime());
    return Math.floor(remaining / 1000); // Return in seconds
  }

  // Generate API key for widget embed
  public static generateWidgetApiKey(widgetId: string, userId: string): string {
    const payload = {
      widgetId,
      userId,
      type: 'widget_api',
    };

    // Widget API keys don't expire
    return jwt.sign(payload, appConfig.jwt.secret);
  }

  public static verifyWidgetApiKey(token: string): { widgetId: string; userId: string } {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

      if (decoded.type !== 'widget_api') {
        throw new AuthenticationError('Invalid API key type');
      }

      return {
        widgetId: decoded.widgetId,
        userId: decoded.userId,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid widget API key');
      }
      throw error;
    }
  }
}
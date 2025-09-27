import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, User, UserRole, LoginRequest, RegisterRequest } from '../types';
import { ResponseHandler } from '../utils/response';
import {
  AuthenticationError,
  ValidationError,
  DuplicateResourceError,
  InvalidCredentialsError
} from '../utils/errors';
import { JWTUtils } from '../utils/jwt';
import { appConfig } from '../utils/config';
import supabaseService from '../services/supabase';
import logger from '../utils/logger';

export class AuthController {
  public async register(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { email, password, first_name, last_name }: RegisterRequest = req.body;

      // Check if user already exists
      const existingUsers = await supabaseService.findMany<User>('users', {
        filters: { email: email.toLowerCase() },
        limit: 1,
      });

      if (existingUsers.length > 0) {
        throw new DuplicateResourceError('User with this email already exists');
      }

      // Hash password
      const saltRounds = appConfig.security.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userData = {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: UserRole.USER,
        is_active: true,
        email_verified: false, // Require email verification in production
      };

      const user = await supabaseService.create<User>('users', userData);

      // Generate tokens
      const tokens = JWTUtils.generateTokens(user);

      // Log successful registration
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;

      return ResponseHandler.created(res, {
        user: userWithoutPassword,
        tokens,
      }, 'User registered successfully');

    } catch (error) {
      logger.error('Registration error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async login(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Find user by email
      const users = await supabaseService.findMany<User>('users', {
        filters: { email: email.toLowerCase() },
        limit: 1,
      });

      const user = users[0];

      if (!user) {
        throw new InvalidCredentialsError('Invalid email or password');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        logger.warn('Failed login attempt', {
          email: email.toLowerCase(),
          ip: req.ip,
        });
        throw new InvalidCredentialsError('Invalid email or password');
      }

      // Update last login
      await supabaseService.update<User>('users', user.id, {
        last_login: new Date().toISOString(),
      });

      // Generate tokens
      const tokens = JWTUtils.generateTokens(user);

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;

      return ResponseHandler.success(res, {
        user: userWithoutPassword,
        tokens,
      }, 'Login successful');

    } catch (error) {
      logger.error('Login error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async refreshToken(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify refresh token
      const payload = JWTUtils.verifyRefreshToken(refresh_token);

      // Get user from database
      const user = await supabaseService.findById<User>('users', payload.userId);

      if (!user || !user.is_active) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = JWTUtils.generateTokens(user);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        ip: req.ip,
      });

      return ResponseHandler.success(res, { tokens }, 'Token refreshed successfully');

    } catch (error) {
      logger.error('Token refresh error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async logout(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      // In a JWT-based system, logout is typically handled client-side
      // by removing the token from storage. However, we can log the event.

      if (req.user) {
        logger.info('User logged out', {
          userId: req.user.id,
          email: req.user.email,
          ip: req.ip,
        });
      }

      return ResponseHandler.success(res, null, 'Logged out successfully');

    } catch (error) {
      logger.error('Logout error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Get fresh user data
      const user = await supabaseService.findById<User>('users', req.user.id);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;

      return ResponseHandler.success(res, { user: userWithoutPassword });

    } catch (error) {
      logger.error('Get profile error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { first_name, last_name } = req.body;

      const updateData: Partial<User> = {};

      if (first_name !== undefined) {
        updateData.first_name = first_name.trim();
      }

      if (last_name !== undefined) {
        updateData.last_name = last_name.trim();
      }

      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Update user
      const updatedUser = await supabaseService.update<User>('users', req.user.id, updateData);

      logger.info('User profile updated', {
        userId: req.user.id,
        updatedFields: Object.keys(updateData),
      });

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return ResponseHandler.success(res, { user: userWithoutPassword }, 'Profile updated successfully');

    } catch (error) {
      logger.error('Update profile error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async changePassword(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { current_password, new_password } = req.body;

      // Get current user data
      const user = await supabaseService.findById<User>('users', req.user.id);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

      if (!isCurrentPasswordValid) {
        throw new InvalidCredentialsError('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = appConfig.security.bcryptRounds;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await supabaseService.update<User>('users', req.user.id, {
        password_hash: newPasswordHash,
      });

      logger.info('User password changed', {
        userId: req.user.id,
        ip: req.ip,
      });

      return ResponseHandler.success(res, null, 'Password changed successfully');

    } catch (error) {
      logger.error('Change password error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async resetPasswordRequest(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      // Find user
      const users = await supabaseService.findMany<User>('users', {
        filters: { email: email.toLowerCase() },
        limit: 1,
      });

      const user = users[0];

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email });
        return ResponseHandler.success(res, null, 'If the email exists, a reset link has been sent');
      }

      if (!user.is_active) {
        logger.warn('Password reset requested for inactive user', { userId: user.id });
        return ResponseHandler.success(res, null, 'If the email exists, a reset link has been sent');
      }

      // Generate reset token
      const resetToken = JWTUtils.generatePasswordResetToken(user.id, user.email);

      // In a real application, you would send this token via email
      // For now, we'll just log it (remove this in production)
      logger.info('Password reset token generated', {
        userId: user.id,
        email: user.email,
        token: resetToken, // Remove this in production
      });

      // TODO: Send email with reset link
      // await emailService.sendPasswordResetEmail(user.email, resetToken);

      return ResponseHandler.success(res, null, 'If the email exists, a reset link has been sent');

    } catch (error) {
      logger.error('Password reset request error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async resetPassword(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { token, new_password } = req.body;

      if (!token || !new_password) {
        throw new ValidationError('Token and new password are required');
      }

      // Verify reset token
      const { userId } = JWTUtils.verifyPasswordResetToken(token);

      // Get user
      const user = await supabaseService.findById<User>('users', userId);

      if (!user || !user.is_active) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = appConfig.security.bcryptRounds;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await supabaseService.update<User>('users', user.id, {
        password_hash: newPasswordHash,
      });

      logger.info('Password reset completed', {
        userId: user.id,
        ip: req.ip,
      });

      return ResponseHandler.success(res, null, 'Password reset successfully');

    } catch (error) {
      logger.error('Password reset error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async verifyEmail(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new ValidationError('Verification token is required');
      }

      // Verify email verification token
      const { userId } = JWTUtils.verifyEmailVerificationToken(token);

      // Get user
      const user = await supabaseService.findById<User>('users', userId);

      if (!user) {
        throw new AuthenticationError('Invalid verification token');
      }

      if (user.email_verified) {
        return ResponseHandler.success(res, null, 'Email already verified');
      }

      // Update email verification status
      await supabaseService.update<User>('users', user.id, {
        email_verified: true,
      });

      logger.info('Email verified', {
        userId: user.id,
        email: user.email,
      });

      return ResponseHandler.success(res, null, 'Email verified successfully');

    } catch (error) {
      logger.error('Email verification error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async resendVerification(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (req.user.email_verified) {
        throw new ValidationError('Email is already verified');
      }

      // Generate verification token
      const verificationToken = JWTUtils.generateEmailVerificationToken(req.user.id, req.user.email);

      // In a real application, you would send this token via email
      logger.info('Email verification token generated', {
        userId: req.user.id,
        email: req.user.email,
        token: verificationToken, // Remove this in production
      });

      // TODO: Send verification email
      // await emailService.sendVerificationEmail(req.user.email, verificationToken);

      return ResponseHandler.success(res, null, 'Verification email sent');

    } catch (error) {
      logger.error('Resend verification error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
}
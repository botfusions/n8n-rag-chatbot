import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, authSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimiting';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register',
  rateLimiters.authEndpoint,
  validate(authSchemas.register),
  authController.register.bind(authController)
);

router.post('/login',
  rateLimiters.authEndpoint,
  validate(authSchemas.login),
  authController.login.bind(authController)
);

router.post('/refresh-token',
  rateLimiters.auth,
  validate(authSchemas.refreshToken),
  authController.refreshToken.bind(authController)
);

router.post('/reset-password-request',
  rateLimiters.passwordReset,
  validate(authSchemas.resetPassword),
  authController.resetPasswordRequest.bind(authController)
);

router.post('/reset-password',
  rateLimiters.passwordReset,
  authController.resetPassword.bind(authController)
);

router.get('/verify-email',
  rateLimiters.strict,
  authController.verifyEmail.bind(authController)
);

// Protected routes
router.use(authenticate);

router.get('/profile',
  authController.getProfile.bind(authController)
);

router.put('/profile',
  validate(authSchemas.register),
  authController.updateProfile.bind(authController)
);

router.post('/change-password',
  validate(authSchemas.changePassword),
  authController.changePassword.bind(authController)
);

router.post('/logout',
  authController.logout.bind(authController)
);

router.post('/resend-verification',
  rateLimiters.strict,
  authController.resendVerification.bind(authController)
);

export default router;
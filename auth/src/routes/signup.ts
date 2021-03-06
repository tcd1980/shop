import express, { Request, Response, response } from 'express';
import { body } from 'express-validator';
import { randomBytes } from 'crypto';
import { validateRequest, BadRequestError } from '@ramsy-dev/microservices-shop-common';
import owasp from 'owasp-password-strength-test';

import { User } from '../models/user';
import { UserSignedUpPublisher } from '../events/publisher/user-signed-up-publisher';
import { natsWrapper } from '../nats-wrapper';
import { setCookie } from '../services/set-cookie';

const router = express.Router();

router.post(
  '/api/users/signup',
  [
    body('fullName')
      .trim()
      .notEmpty()
      .withMessage('You must supply a full name'),
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').custom((value, { req }) => {
      // invoke test() to test the strength of a password
      var result = owasp.test(value);

      if (!result.strong) {
        throw new Error(result.errors.join(' '));
      }

      // Indicates the success of this synchronous custom validator
      return true;
    }),
    body('passwordConfirmation').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }

      // Indicates the success of this synchronous custom validator
      return true;
    }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new BadRequestError('Email in use');
    }

    const user = User.build({ fullName, email, password });

    const emailToken = randomBytes(16).toString('hex');

    user.set({ emailToken });

    // Check if an admin is registrering
    if (process.env.ADMIN_EMAIL === email) {
      user.set({ isAdmin: true });
    }

    await user.save();

    // FIXME does this belong here, or does this need to be moved to the notifiction service
    
    const link = `${process.env.BASE_URL}/api/users/verify-email/${emailToken}`;

    // FIXME properly mock this
      new UserSignedUpPublisher(natsWrapper.client).publish({ email: user.email, link });

    // FIXME maybe we need to set a cookie here with an unverified flag

    if (process.env.NODE_ENV === "test") {
      setCookie(user, req);
    }

    res.status(200).send({});
  },
);

export { router as signupRouter };

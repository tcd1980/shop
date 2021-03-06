import express, { NextFunction } from 'express';
import helmet from 'helmet';
import 'express-async-errors';
import cookieSession from 'cookie-session';
import {
  errorHandler,
  NotFoundError,
  currentUser,
} from '@ramsy-dev/microservices-shop-common';
import { uploadRouter } from './routes/upload';

const { healthz } = require('express-healthz');


const app = express();

app.use(helmet());
app.set('trust proxy', true);
app.use(
  cookieSession({
    name: 'shop',
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  }),
);

app.use(healthz);

app.use(currentUser);

app.use(uploadRouter);

// Catch all non defined urls
app.all('*', () => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };

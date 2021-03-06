import express from 'express';
import helmet from 'helmet';
import 'express-async-errors';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import {
  errorHandler,
  NotFoundError,
} from '@ramsy-dev/microservices-shop-common';

import { indexRouter } from './routes/index';
import { authRouter } from './routes/auth';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { productsRouter } from './routes/products';
import {swaggerRouter} from './routes/swagger';

import { COOKIE_NAME } from '.';

const { healthz } = require('express-healthz');


const app = express();
app.use(helmet());
app.set('trust proxy', true);

app.use(json());
app.use(
  cookieSession({
    name: COOKIE_NAME,
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  }),
);

app.use(healthz)

app.use(indexRouter);
app.use(authRouter);
app.use(ordersRouter);
app.use(paymentsRouter);
app.use(productsRouter);
app.use(swaggerRouter);

// Catch all non defined urls
app.all('*', (req) => {
  console.log(req.url)
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };

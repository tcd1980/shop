import express, { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import {
  requireAuth,
  validateRequest,
  BadRequestError,
  NotFoundError,
} from '@ramsy-dev/microservices-shop-common';
import mongoose from 'mongoose';

import { Product } from '../models/product';
import { ProductCreatedPublisher } from '../events/publishers/product-created-publisher';
import { natsWrapper } from '../nats-wrapper';
import { Category } from '../models/category';

const router = express.Router();

router.post(
  '/api/products',
  (req: Request, res: Response, next: NextFunction) =>
    requireAuth(req, res, next, { withAdmin: true }),
  [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price')
      .isFloat({ gt: 0 })
      .withMessage('Price must be greater than 0'),
    body('cost').isFloat({ gt: 0 }).withMessage('Cost must be greater than 0'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, price, cost, categoryId, imageUrl } = req.body;

    let category = undefined;

    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      const _category = await Category.findById(categoryId);

      if (!_category) {
        throw new NotFoundError();
      }
      category = _category
    }
    
    const existingProduct = await Product.findOne({ title });

    if (existingProduct) {
      throw new BadRequestError('Product with same title already exists');
    }

    const product = Product.build({
      title,
      price,
      cost,
      category,
      imageUrl,
      userId: req.currentUser!.id,
    });
    await product.save();

    /**
     * INFO:
     *
     * In this setup and a very specific situation where we might have issues with losing the connection to NATS
     * after saving the data, we might run into data consistency issues. We do not expect that to happen.
     *
     * When we run into the issues the solution would be to save both the data and the event with a database
     * transaction which ensures both fields need to be saved. We will then add a sent flag to the event where
     * we can detect whether the event has been sent or not. We will need to implement new code to watch
     * for new database actions and process the events. That will prevent any consistency issues.
     *
     * When this is implemented we can remove the await keyword safely and gain some performance as well.
     */

    await new ProductCreatedPublisher(natsWrapper.client).publish({
      id: product.id,
      version: product.version,
      title: product.title,
      price: product.price,
      cost: product.cost,
      imageUrl: product.imageUrl,
      category: category
        ? {
            id: category.id,
            title: category.title,
          }
        : undefined,
      userId: product.userId,
    });

    res.status(201).send(product);
  },
);

export { router as createProductRouter };

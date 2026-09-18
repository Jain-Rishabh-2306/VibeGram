import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(createError(`Route ${req.method} ${req.url} not found`, 404));
}

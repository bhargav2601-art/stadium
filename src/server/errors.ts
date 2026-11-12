export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export class AuthError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super(message, 403);
  }
}

export function publicError(error: unknown) {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}

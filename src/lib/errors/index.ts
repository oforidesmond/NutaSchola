export type FieldErrors = Record<string, string[]>;

export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<T> {
  return { ok: false, error: { code, message, fieldErrors } };
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: string,
    message: string,
    options?: { status?: number; fieldErrors?: FieldErrors },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? 400;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function toActionError(error: unknown): ActionError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  console.error("[unhandled]", error);
  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  };
}

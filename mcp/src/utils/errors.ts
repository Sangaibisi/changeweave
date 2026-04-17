export class ChangeWeaveError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ChangeWeaveError";
  }
}

export class GitProviderError extends ChangeWeaveError {
  constructor(message: string, statusCode?: number) {
    super(message, "GIT_PROVIDER_ERROR", statusCode);
    this.name = "GitProviderError";
  }
}

export class BackendApiError extends ChangeWeaveError {
  constructor(message: string, statusCode?: number) {
    super(message, "BACKEND_API_ERROR", statusCode);
    this.name = "BackendApiError";
  }
}

export class TokenBudgetExceededError extends ChangeWeaveError {
  constructor(requested: number, budget: number) {
    super(
      `Token budget exceeded: requested ${requested}, budget ${budget}`,
      "TOKEN_BUDGET_EXCEEDED",
    );
    this.name = "TokenBudgetExceededError";
  }
}

export class ConfigurationError extends ChangeWeaveError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

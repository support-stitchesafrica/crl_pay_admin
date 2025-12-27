export class ApiResponse<T = any> {
  constructor(
    public success: boolean,
    public message: string,
    public data?: T,
    public error?: any,
  ) {}

  static success<T>(data: T, message = 'Operation successful'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error(message: string, error?: any): ApiResponse {
    return new ApiResponse(false, message, null, error);
  }

  static systemError(message: string): ApiResponse {
    return new ApiResponse(false, message || 'Internal server error');
  }

  static validationError(errors: any): ApiResponse {
    return new ApiResponse(false, 'Validation failed', null, errors);
  }

  static notFound(message = 'Resource not found'): ApiResponse {
    return new ApiResponse(false, message);
  }

  static unauthorized(message = 'Unauthorized access'): ApiResponse {
    return new ApiResponse(false, message);
  }

  static forbidden(message = 'Access forbidden'): ApiResponse {
    return new ApiResponse(false, message);
  }
}

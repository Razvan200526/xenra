import { HttpException } from "./HttpException";

export class ValidationException extends HttpException {
  constructor(message: string) {
    super(message, 400);
  }
}

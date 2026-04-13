import { HttpException } from "./HttpException";

export class NotFoundException extends HttpException {
  constructor() {
    super("Not Found", 404);
  }
}

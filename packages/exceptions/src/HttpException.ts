export class HttpException extends Error {
  status_code: number;
  constructor(message: string, status_code = 500) {
    super(message);
    this.status_code = status_code;
  }
}

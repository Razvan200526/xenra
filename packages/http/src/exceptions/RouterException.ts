export class RouterException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouterException";
  }
}

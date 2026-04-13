export class RouterException extends Error {
  constructor(message: string) {
    super(message, {
      cause: "Route name exists",
    });
    this.name = "RouterException";
  }
}

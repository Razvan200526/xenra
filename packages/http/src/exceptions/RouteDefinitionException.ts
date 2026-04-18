export class RouteDefinitionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteDefinitionException";
  }
}

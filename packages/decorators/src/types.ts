export interface IValidator<TInput = unknown, TOutput = TInput> {
  validate(input: TInput): TOutput | Promise<TOutput>;
}

export type RouteValidators = Partial<{
  body: IValidator<unknown, unknown>;
  query: IValidator<unknown, unknown>;
  params: IValidator<unknown, unknown>;
}>;

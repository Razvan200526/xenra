export interface IValidator<TInput = unknown, TOutput = TInput> {
  validate(input: TInput): TOutput | Promise<TOutput>;
}

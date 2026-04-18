import type {
  SocketController as BaseSocketController,
  RegisteredSocketRoute,
  SocketChannel,
  SocketContextLike,
  SocketControllerClass,
  SocketHandlerResponse,
  SocketMiddlewareLike,
  ValidatedData,
} from "@xenra/http";

export type SocketData = Record<string, unknown> | undefined;

export type SocketMessage = string | Buffer<ArrayBuffer>;

export type SocketConnectionData<TData = SocketData> = {
  id: string;
  data?: TData;
};

export type SocketSession = {
  id: string;
  req: Request;
  route: RegisteredSocketRoute;
  params: Record<string, string>;
  validated: ValidatedData;
  data?: SocketData;
};

export type SocketContext<TData = SocketData, TValidated extends ValidatedData = ValidatedData> = SocketContextLike<
  TData,
  TValidated
>;

export type SocketMiddleware<
  TData = SocketData,
  TValidated extends ValidatedData = ValidatedData,
> = SocketMiddlewareLike<TData, TValidated>;

export type SocketController<
  TData = SocketData,
  TValidated extends ValidatedData = ValidatedData,
> = BaseSocketController<TData, TValidated>;

export type { SocketChannel, SocketControllerClass, SocketHandlerResponse };

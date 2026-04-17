import { routeRegex } from "@xenra/http";
import { logger } from "@xenra/logger";
import { type } from "arktype";

export const pathNameFormat = type(routeRegex);

export type RoutePathType = typeof pathNameFormat.infer;

export const isPathValid = (path: string, controllerName: string) => {
  const result = pathNameFormat(path);

  if (result instanceof type.errors) {
    logger.error(`Invalid path on ${controllerName} , input -> ${path}`);
    return null;
  }
  return result as RoutePathType;
};

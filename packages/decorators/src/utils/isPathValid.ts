import { routeRegex } from "@xenra/http";
import { type } from "arktype";
import { logger } from "@xenra/logger";

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

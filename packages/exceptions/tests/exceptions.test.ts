import { describe, expect, test } from "bun:test";
import { HttpException, NotFoundException, ValidationException } from "../src";

describe("@xenra/exceptions", () => {
  test("HttpException stores name, message, and statusCode", () => {
    const error = new HttpException("Unauthorized", 401);

    expect(error.name).toBe("HttpException");
    expect(error.message).toBe("Unauthorized");
    expect(error.statusCode).toBe(401);
  });

  test("HttpException defaults statusCode to 500", () => {
    const error = new HttpException("Boom");

    expect(error.statusCode).toBe(500);
  });

  test("NotFoundException uses a 404 status", () => {
    const error = new NotFoundException();

    expect(error).toBeInstanceOf(HttpException);
    expect(error.message).toBe("Not Found");
    expect(error.statusCode).toBe(404);
  });

  test("ValidationException uses a 400 status", () => {
    const error = new ValidationException("Invalid body");

    expect(error).toBeInstanceOf(HttpException);
    expect(error.message).toBe("Invalid body");
    expect(error.statusCode).toBe(400);
  });
});

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packageRoot = process.cwd();
const sourceRoot = join(packageRoot, "src");
const packageJsonPath = join(packageRoot, "package.json");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    if (!entry.name.endsWith(".ts")) {
      return [];
    }

    return [fullPath];
  });
}

describe("@xenra/http package boundaries", () => {
  test("source files do not import decorators, container, or logger", () => {
    const sourceFiles = listSourceFiles(sourceRoot);

    for (const file of sourceFiles) {
      const contents = readFileSync(file, "utf8");

      expect(contents).not.toContain("@xenra/decorators");
      expect(contents).not.toContain("@xenra/container");
      expect(contents).not.toContain("@xenra/logger");
    }
  });

  test("package.json does not declare decorators, container, or logger as dependencies", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.["@xenra/decorators"]).toBeUndefined();
    expect(packageJson.dependencies?.["@xenra/container"]).toBeUndefined();
    expect(packageJson.dependencies?.["@xenra/logger"]).toBeUndefined();
  });
});

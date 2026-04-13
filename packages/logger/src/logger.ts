/** biome-ignore-all lint/suspicious/noConsole: <logger utility> */

import PrettyError from "pretty-error";
import * as p from "picocolors";
import { fallbackSymbols } from "figures";
const pe = new PrettyError();

export const logger = {
  error: (message: string) => {
    console.error(p.redBright(`${fallbackSymbols.cross} ${message}`));
  },
  success: (message: string) => {
    console.log(p.greenBright(`${fallbackSymbols.tick} ${message}`));
  },
  exception: (error: unknown) => {
    if (error instanceof Error) {
      console.error(pe.render(error));
    }
    console.error(error);
  },
  warn: (message: string) => {
    console.warn(p.yellowBright(`${fallbackSymbols.warning} ${message}`));
  },
  info: (message: string) => {
    console.log(p.blueBright(`${fallbackSymbols.info} ${message}`));
  },
};

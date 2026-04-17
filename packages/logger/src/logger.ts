/** biome-ignore-all lint/suspicious/noConsole: <logger utility> */

import { mainSymbols } from "figures";
import * as p from "picocolors";
import PrettyError from "pretty-error";

const pe = new PrettyError();

export const logger = {
  error: (message: string) => {
    console.error(p.redBright(`${mainSymbols.cross} ${message}`));
  },
  success: (message: string) => {
    console.log(p.green(`${mainSymbols.tick} ${message}`));
  },
  exception: (error: unknown) => {
    if (error instanceof Error) {
      console.error(pe.render(error));
    } else {
      console.error(error);
    }
  },
  warn: (message: string) => {
    console.warn(p.yellowBright(`${mainSymbols.warning} ${message}`));
  },
  info: (message: string) => {
    console.log(p.blueBright(`${mainSymbols.info} ${message}`));
  },
};

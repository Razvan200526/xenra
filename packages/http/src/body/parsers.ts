import { MIME_TYPES } from "./mimeType";

export type BodyParser = (req: Request) => Promise<unknown>;

export const bodyParsers: Record<string, BodyParser> = {
  [MIME_TYPES.JSON]: async (req) => {
    const text = await req.text();

    if (!text.trim()) {
      return undefined;
    }

    return JSON.parse(text);
  },

  [MIME_TYPES.FORM_URLENCODED]: async (req) => {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  },

  [MIME_TYPES.TEXT_PLAIN]: async (req) => {
    const text = await req.text();
    return text.length === 0 ? undefined : text;
  },

  [MIME_TYPES.TEXT_HTML]: async (req) => {
    const text = await req.text();
    return text.length === 0 ? undefined : text;
  },

  [MIME_TYPES.XML_APP]: async (req) => {
    const text = await req.text();
    return text.length === 0 ? undefined : text;
  },

  [MIME_TYPES.XML_TEXT]: async (req) => {
    const text = await req.text();
    return text.length === 0 ? undefined : text;
  },
};

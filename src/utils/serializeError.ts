// src/utils/serializeError.ts
export const serializeError = (err: unknown) => {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
  }
  try {
    return { value: JSON.parse(JSON.stringify(err)) };
  } catch {
    return { value: String(err) };
  }
};

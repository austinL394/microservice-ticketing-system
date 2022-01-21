/* eslint-disable @typescript-eslint/no-explicit-any */
function destroyCircular(from: any | any[], seen: any): any {
  const to: any = Array.isArray(from) ? [] : {};

  seen.push(from);

  for (const [key, value] of Object.entries(from)) {
    if (typeof value === 'function') {
      continue;
    }

    if (!value || typeof value !== 'object') {
      to[key] = value;
      continue;
    }

    if (!seen.includes(from[key])) {
      to[key] = destroyCircular(from[key], seen.slice());
      continue;
    }

    to[key] = '[Circular]';
  }

  const commonProperties = ['name', 'message', 'stack', 'code'];

  for (const property of commonProperties) {
    if (typeof from[property] === 'string') {
      to[property] = from[property];
    }
  }

  return to;
}

export function serializeError(value: unknown): any {
  if (typeof value === 'object') {
    return destroyCircular(value, []);
  }

  // People sometimes throw things besides Error objects…
  if (typeof value === 'function') {
    // `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  return value;
}

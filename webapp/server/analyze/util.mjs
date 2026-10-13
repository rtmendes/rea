// Runtime-neutral helpers shared by analyzer modules (Node and browser).
const encoder = new TextEncoder()
export function byteLength(text) { return encoder.encode(text || '').length }

// Vercel serverless entry point for pushing a board to OmniCanvas; same handler as the local server.
import { handleOmniCanvas } from '../server/handler.mjs'

export const config = { maxDuration: 30 }
export default function handler(req, res) {
  return handleOmniCanvas(req, res)
}

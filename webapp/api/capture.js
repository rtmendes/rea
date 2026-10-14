// Vercel serverless entry point for single-page renders; same handler as the local server.
import { handleCapture } from '../server/handler.mjs'

export const config = { maxDuration: 60 }
export default function handler(req, res) {
  return handleCapture(req, res)
}

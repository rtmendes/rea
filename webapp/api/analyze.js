// Vercel serverless entry point; same handler as the local server.
import { handleAnalyze } from '../server/handler.mjs'

export const config = { maxDuration: 60 }
export default function handler(req, res) {
  return handleAnalyze(req, res)
}

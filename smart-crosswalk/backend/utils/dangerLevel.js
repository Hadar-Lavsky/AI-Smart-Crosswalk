// Helper function to determine danger level from confidence
export default function getDangerLevelFromConfidence(confidence) {
  if (!confidence) return "MEDIUM";
  const conf = parseFloat(confidence);
  if (conf >= 0.7) return "HIGH";
  if (conf >= 0.4) return "MEDIUM";
  return "LOW";
}

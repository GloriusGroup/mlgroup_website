const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #22d3ee, #0891b2)",
  "linear-gradient(135deg, #3b82f6, #2563eb)",
  "linear-gradient(135deg, #22d3ee, #3b82f6)",
  "linear-gradient(135deg, #06b6d4, #0891b2)",
  "linear-gradient(135deg, #0ea5e9, #0284c7)",
  "linear-gradient(135deg, #3b82f6, #6366f1)",
  "linear-gradient(135deg, #22d3ee, #06b6d4)",
  "linear-gradient(135deg, #0ea5e9, #22d3ee)",
];

const ALT_AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #C8102E, #9B1B30)",
  "linear-gradient(135deg, #002554, #005689)",
  "linear-gradient(135deg, #9B1B30, #002554)",
  "linear-gradient(135deg, #005689, #006E89)",
  "linear-gradient(135deg, #C8102E, #002554)",
  "linear-gradient(135deg, #585C7D, #002554)",
  "linear-gradient(135deg, #006E89, #4A8882)",
  "linear-gradient(135deg, #9B1B30, #585C7D)",
];

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getInitials(name: string): string {
  const cleaned = name.replace(/Prof\.\s*|Dr\.\s*/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarGradient(name: string, useAlt = false): string {
  const gradients = useAlt ? ALT_AVATAR_GRADIENTS : AVATAR_GRADIENTS;
  return gradients[hashCode(name) % gradients.length];
}

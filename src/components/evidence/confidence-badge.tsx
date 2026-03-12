'use client';

type ConfidenceBadgeProps = {
  confidence: number;
  className?: string;
};

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);

  // Color coding based on thresholds
  const colorClasses =
    confidence >= 0.85
      ? 'bg-green-100 text-green-800'
      : confidence >= 0.7
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800';

  const label = confidence >= 0.85 ? 'High' : confidence >= 0.7 ? 'Medium' : 'Low';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${colorClasses} ${className}`}
      aria-label={`Confidence: ${percentage}%`}
      title={`Confidence: ${percentage}%`}
    >
      <span className="w-2 h-2 rounded-full bg-current"></span>
      <span>{label}</span>
      <span className="opacity-75">•</span>
      <span>{percentage}%</span>
    </div>
  );
}

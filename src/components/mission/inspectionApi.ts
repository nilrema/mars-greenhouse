import type { DiseaseInspectionAssessment, InspectionSelection } from './types';

export async function inspectDisease(
  imageDataUrl: string,
  selection: InspectionSelection
): Promise<DiseaseInspectionAssessment> {
  const response = await fetch('/api/inspect-disease', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageDataUrl,
      selection,
      cameraId: selection.cameraId,
    }),
  });

  const payload = (await response.json()) as Partial<DiseaseInspectionAssessment> & { error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'Disease inspection failed.');
  }

  return {
    disease: typeof payload.disease === 'string' ? payload.disease : 'unknown',
    riskLevel: payload.riskLevel === 'low' || payload.riskLevel === 'medium' || payload.riskLevel === 'high'
      ? payload.riskLevel
      : 'medium',
    explanation:
      typeof payload.explanation === 'string' && payload.explanation.trim()
        ? payload.explanation
        : 'The disease inspection returned no explanation.',
  };
}

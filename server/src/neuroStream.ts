export type ChannelSample = {
  label: string;
  values: number[];
};

const CHANNELS = ["Fp1", "Fp2", "F3", "F4"];

export const generateSamples = (): ChannelSample[] => {
  const now = Date.now();
  const samplesPerChannel = 16;

  return CHANNELS.map((label, idx) => {
    const baseFreq = 8 + idx * 2;
    const values = Array.from({ length: samplesPerChannel }, (_, i) => {
      const t = (now + i * 10) / 1000;
      const sine = Math.sin(2 * Math.PI * baseFreq * t);
      const noise = (Math.random() - 0.5) * 0.4;

      const spike = Math.random() < 0.003 ? (Math.random() - 0.5) * 6 : 0;
      return sine * 0.7 + noise + spike;
    });

    return { label, values };
  });
}

export const computeRMS = (values: number[]) => {
  if (!values.length) return 0;
  const sumSq = values.reduce((s, v) => s + v * v, 0);
  return Math.sqrt(sumSq / values.length);
}

export const computeAnomalyScore = (channels: ChannelSample[]) => {
  const rms = channels.map((ch) => computeRMS(ch.values));
  const maxRms = Math.max(...rms, 0.0001);
  const threshold = 1.4;
  const score = Math.max(0, (maxRms - threshold) / (threshold * 2));
  return { score: Math.min(1, score), maxRms };
}

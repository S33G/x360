import { analyzeNand, redactReport } from './core';
import { createDemoNand } from './demo';

interface AnalysisRequest {
  id: number;
  buffer?: ArrayBuffer;
  demo?: boolean;
  cpuKey?: Uint8Array;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage: (value: unknown) => void;
};

scope.onmessage = async (event) => {
  const request = event.data;
  let input: Uint8Array | undefined;
  let response: unknown;
  try {
    input = request.demo ? createDemoNand() : request.buffer ? new Uint8Array(request.buffer) : new Uint8Array(0);
    const report = await analyzeNand(input, { cpuKey: request.cpuKey });
    response = { id: request.id, report: redactReport(report) };
  } catch {
    // Never serialize exceptions: they can contain input paths or sensitive bytes.
    response = { id: request.id, error: 'This image could not be analyzed. Check its size and format, then try again.' };
  } finally {
    input?.fill(0);
    request.cpuKey?.fill(0);
  }
  // Clear transferred bytes before the UI receives completion and terminates us.
  scope.postMessage(response);
};

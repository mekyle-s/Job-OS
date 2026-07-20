import { describe, expect, it } from 'vitest';
import { extractTextFromPDF } from './pdf-extractor';

describe('extractTextFromPDF', () => {
  it('rejects corrupt PDFs with the parser reason, not "undefined"', async () => {
    const corrupt = Buffer.from('%PDF-1.4\nthis is not a real pdf body at all');
    await expect(extractTextFromPDF(corrupt)).rejects.toThrow(/^PDF parsing error: (?!undefined)/);
  });

  it('rejects non-PDF bytes without leaking internals', async () => {
    const notPdf = Buffer.from('hello world');
    const err = await extractTextFromPDF(notPdf).then(
      () => null,
      (e: Error) => e
    );
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/^PDF parsing error: /);
    expect(err!.message).not.toContain('undefined');
    expect(err!.message).not.toMatch(/node_modules|\\|\//);
  });
});

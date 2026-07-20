import PDFParser from 'pdf2json';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      try {
        // Helper to safely decode URI component
        const safeDecode = (encoded: string): string => {
          try {
            return decodeURIComponent(encoded);
          } catch {
            // If decoding fails, return the original string
            return encoded;
          }
        };

        // Extract text from all pages
        const text = (pdfData as any).Pages.map((page: any) =>
          page.Texts.map((text: any) => text.R.map((r: any) => safeDecode(r.T)).join(' ')).join(' ')
        ).join('\n');

        if (!text || text.trim().length === 0) {
          reject(new Error('PDF contains no extractable text (may be image-based)'));
        } else {
          resolve(text);
        }
      } catch (error) {
        console.error('PDF parsing error:', error);
        reject(
          new Error(
            `Failed to parse PDF text: ${error instanceof Error ? error.message : 'unknown error'}`
          )
        );
      }
    });

    pdfParser.on('pdfParser_dataError', (errData: Error | { parserError: Error }) => {
      // pdf2json emits Error objects, {parserError} wrappers, or plain strings
      const raw = errData instanceof Error ? errData : errData?.parserError;
      const message = (
        raw instanceof Error
          ? raw.message
          : typeof raw === 'string' && raw
            ? raw
            : String(raw ?? 'unrecognized or corrupted PDF')
      ).replace(/^(Error:\s*)+/, ''); // pdf2json stacks redundant "Error: " prefixes
      reject(new Error(`PDF parsing error: ${message}`));
    });

    pdfParser.parseBuffer(buffer);
  });
}

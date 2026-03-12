export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exports PDFParse class requiring LoadParameters
  const { PDFParse } = await import('pdf-parse');
  const pdfParse = new PDFParse({ data: buffer });
  const result = await pdfParse.getText();
  if (!result.text || result.text.trim().length === 0) {
    throw new Error('PDF contains no extractable text (may be image-based)');
  }
  return result.text;
}

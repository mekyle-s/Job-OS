import mammoth from 'mammoth';

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (error) {
    // Wrap mammoth internals in a stable, client-safe message (the upload
    // route forwards extraction messages to the user as 400s)
    const message =
      error instanceof Error && error.message ? error.message : 'unrecognized or corrupted DOCX';
    throw new Error(`DOCX parsing error: ${message}`);
  }
  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX contains no extractable text');
  }
  if (result.messages.length > 0) {
    console.warn('DOCX extraction warnings:', result.messages);
  }
  return result.value;
}

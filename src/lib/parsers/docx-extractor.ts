import mammoth from 'mammoth';

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX contains no extractable text');
  }
  if (result.messages.length > 0) {
    console.warn('DOCX extraction warnings:', result.messages);
  }
  return result.value;
}

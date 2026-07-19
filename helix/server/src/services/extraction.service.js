const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function extractText(buffer, mimeType) {
  if (mimeType === PDF_MIME) {
    const { text } = await pdfParse(buffer);
    return text;
  }

  if (mimeType === DOCX_MIME) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (mimeType.startsWith('image/')) {
    const { data } = await Tesseract.recognize(buffer, 'eng');
    return data.text;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

module.exports = { extractText };

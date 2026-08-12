/** Extract readable text locally before sending a resume to the optional AI parser. */
export async function readResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose a file smaller than 10 MB.');
  if (name.endsWith('.txt')) return file.text();
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = await Promise.all(Array.from({ length: document.numPages }, async (_, index) => {
      const content = await (await document.getPage(index + 1)).getTextContent();
      return content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    }));
    return pages.join('\n');
  }
  if (name.endsWith('.docx')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    for (let offset = 0; offset <= bytes.length - 30; offset++) {
      if (view.getUint32(offset, true) !== 0x04034b50) continue;
      const compressedSize = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const entryName = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
      if (entryName !== 'word/document.xml') continue;
      const start = offset + 30 + nameLength + extraLength;
      const compressed = bytes.slice(start, start + compressedSize);
      const xml = new TextDecoder().decode(new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()));
      return xml.replace(/<w:tab[^>]*\/>/g, ' ').replace(/<w:br[^>]*\/>/g, '\n').replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
    }
    throw new Error('This DOCX file could not be read.');
  }
  if (name.endsWith('.doc')) throw new Error('Legacy .doc files cannot be safely read in the browser. Please save it as .docx or PDF and upload that copy.');
  throw new Error('Use a PDF, DOCX, or TXT resume.');
}

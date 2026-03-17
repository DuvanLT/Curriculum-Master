import { extractText } from 'unpdf'

async function run() {
  const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF');
  try {
    const result = await extractText(fakePdf, { mergePages: true });
    console.log(result);
  } catch (e) {
    console.error("ERROR CAUGHT:");
    console.error(e);
  }
}
run();


import fs from 'fs';
import path from 'path';
import { createManuscript } from './chapter-writer.js';

const topic = "AI Side Hustles 2025: 7 Ways to Make Money with Zero Investment";
const outlineData = JSON.parse(fs.readFileSync('/tmp/outline.json', 'utf8'));

// Add chapterNumber to outline if missing
const outline = outlineData.chapters.map((ch, index) => ({
  ...ch,
  chapterNumber: index + 1
}));

console.log(`Starting manuscript generation for topic: ${topic}`);

// Custom function to save to the lead's preferred path
async function generateAndSave() {
  try {
    // We can't easily change the hardcoded path in chapter-writer.js without editing it,
    // so we'll let it save to its default and then move it.
    const tempPath = await createManuscript(topic, outline);
    
    const finalPath = '/home/team/shared/revenue-os/output/ebook/manuscript.md';
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.copyFileSync(tempPath, finalPath);
    console.log(`Final manuscript moved to ${finalPath}`);
  } catch (error) {
    console.error('Generation failed:', error);
  }
}

generateAndSave();

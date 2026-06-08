'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function writeChapter(topic, chapterInfo) {
  console.log(`Writing Chapter ${chapterInfo.chapterNumber}: ${chapterInfo.title}`);

  const prompt = `Write the full content for Chapter ${chapterInfo.chapterNumber} of an ebook titled "${topic}". 
Chapter Title: ${chapterInfo.title}
Chapter Description: ${chapterInfo.description}
The content should be approximately 1000-1200 words. Be practical, actionable, and include specific examples where possible.
Use Markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error(`Error writing chapter ${chapterInfo.chapterNumber}:`, error);
    throw error;
  }
}

export async function createManuscript(topic, outline) {
  let manuscript = `# ${topic}\n\n`;

  for (const chapter of outline) {
    const content = await writeChapter(topic, chapter);
    manuscript += `## Chapter ${chapter.chapterNumber}: ${chapter.title}\n\n${content}\n\n`;
  }

  const outputPath = path.join(__dirname, 'output', 'ebook', 'manuscript.md');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, manuscript, 'utf-8');
  console.log(`Manuscript saved to ${outputPath}`);
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const topic = process.argv[2] || 'AI Revenue Operating System';
  // Mock outline for testing if called directly
  const mockOutline = [
    { chapterNumber: 1, title: 'Introduction', description: 'Overview of AI in revenue' },
    { chapterNumber: 2, title: 'Setting up ACE', description: 'How to install and configure' }
  ];
  createManuscript(topic, mockOutline);
}

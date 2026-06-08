'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function writeScript(topic) {
  console.log(`Generating script for topic: ${topic}`);

  const prompt = `Write a 7-10 minute faceless YouTube video script about "${topic}". 
Include an engaging intro, several key points, and a call to action. 
The tone should be informative and engaging. 
Format the output as a plain text script.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const script = response.choices[0].message.content;
    const outputPath = path.join(__dirname, 'output', 'youtube', 'youtube-script.txt');
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    fs.writeFileSync(outputPath, script, 'utf-8');
    console.log(`Script saved to ${outputPath}`);
    return script;
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const topic = process.argv[2];
  if (!topic) {
    console.error('Usage: node script-writer.js <topic>');
    process.exit(1);
  }
  writeScript(topic);
}

'use strict';

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateOutline(topic) {
  console.log(`Generating outline for ebook: ${topic}`);

  const prompt = `Create a detailed chapter outline for a non-fiction ebook about "${topic}". 
The ebook should have at least 10 chapters. 
Format the output as a JSON array of objects, where each object has "chapterNumber", "title", and "description".`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const content = JSON.parse(response.choices[0].message.content);
    // Support both { "chapters": [...] } and direct array if the model decides
    const outline = content.chapters || (Array.isArray(content) ? content : Object.values(content)[0]);
    
    return outline;
  } catch (error) {
    console.error('Error generating outline:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const topic = process.argv[2] || 'How to build passive income with AI';
  generateOutline(topic).then(outline => console.log(JSON.stringify(outline, null, 2)));
}

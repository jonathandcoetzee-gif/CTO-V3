'use strict';

import fs from 'fs';
import { google } from 'googleapis';

const youtube = google.youtube('v3');

// These would normally be loaded from a secure location or env
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

export async function uploadVideo(videoPath, title, description, thumbnailPath) {
  try {
    const res = await youtube.videos.insert({
      auth: oauth2Client,
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['AI', 'Automation', 'Revenue'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'private', // Default to private for safety
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    console.log(`Video uploaded! ID: ${res.data.id}`);

    if (thumbnailPath) {
      await youtube.thumbnails.set({
        auth: oauth2Client,
        videoId: res.data.id,
        media: {
          body: fs.createReadStream(thumbnailPath),
        },
      });
      console.log('Thumbnail set!');
    }

    return res.data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [videoPath, title, description, thumbnailPath] = process.argv.slice(2);
  if (!videoPath || !title) {
    console.error('Usage: node youtube-uploader.js <videoPath> <title> [description] [thumbnailPath]');
    process.exit(1);
  }
  uploadVideo(videoPath, title, description, thumbnailPath);
}

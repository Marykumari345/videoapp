import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini client with proper telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: AI Video Director (Prompt to cinematic scenes breakdown and parameters)
app.post('/api/ai/direct-video', async (req: Request, res: Response) => {
  try {
    const { 
      prompt, 
      aspectRatio = '16:9', 
      duration = 20, 
      style = 'cinematic',
      mediaType = 'generative',
      audioMood
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const systemInstruction = `You are a visionary Hollywood cinematography director and generative visual effects master.
Given a user's prompt, generate a structured, highly aesthetic 20-second video composition specification.
The composition will be synthesized into real animated canvas video frames.
Provide rich visual parameters including camera motion, visual theme colors, particle types, lighting mood, and poetic captions.`;

    const contents = `Direct a ${duration}-second ${aspectRatio} video based on: "${prompt}". Selected style: ${style}.${
      mediaType && mediaType !== 'generative' ? ` Visual source: user-uploaded ${mediaType}.` : ''
    }${audioMood ? ` Soundtrack mood: ${audioMood}.` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short evocative title for the shot' },
            cinematicStyle: { type: Type.STRING, description: 'Style description' },
            cameraMotion: { 
              type: Type.STRING, 
              description: 'One of: pan_right, pan_left, slow_zoom_in, slow_zoom_out, orbit, drift_up' 
            },
            palette: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING, description: 'Hex color for base tone' },
                secondary: { type: Type.STRING, description: 'Hex color for mid-tone' },
                accent: { type: Type.STRING, description: 'Hex color for highlight' },
                ambient: { type: Type.STRING, description: 'Hex color for deep shadow' },
              },
              required: ['primary', 'secondary', 'accent', 'ambient'],
            },
            particles: {
              type: Type.STRING,
              description: 'One of: rain, dust_motes, glowing_embers, mist, stars, bokeh_bubbles, cyber_grid, none'
            },
            sceneType: {
              type: Type.STRING,
              description: 'One of: landscape, cityscape, abstract_flow, cosmic, ocean, portrait'
            },
            lightingMood: { type: Type.STRING, description: 'Golden hour, moody overcast, neon rim, bioluminescent, dramatic chiaroscuro' },
            suggestedCaption: { type: Type.STRING, description: 'A brief, poetic single-line caption overlay (max 8 words)' },
            musicMood: { type: Type.STRING, description: 'Recommended soundtrack mood (e.g., Chill Lo-Fi, Cinematic Ambient, Synthwave)' },
            pacingBpm: { type: Type.INTEGER, description: 'Suggested musical BPM between 60 and 130' }
          },
          required: ['title', 'cinematicStyle', 'cameraMotion', 'palette', 'particles', 'sceneType', 'lightingMood', 'suggestedCaption', 'musicMood', 'pacingBpm'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, scene: parsed });
  } catch (error: any) {
    console.error('Error directing video with Gemini:', error);
    // Graceful fallback for offline / mock resilience
    return res.json({
      success: true,
      scene: {
        title: req.body.prompt?.slice(0, 30) || 'Cinematic Vision',
        cinematicStyle: req.body.style || 'Cinematic Film',
        cameraMotion: 'slow_zoom_in',
        palette: {
          primary: '#1e293b',
          secondary: '#334155',
          accent: '#38bdf8',
          ambient: '#020617',
        },
        particles: 'mist',
        sceneType: 'landscape',
        lightingMood: 'Atmospheric natural lighting',
        suggestedCaption: 'A moment frozen in motion',
        musicMood: 'Cinematic Ambient',
        pacingBpm: 75,
      },
    });
  }
});

// Endpoint: Prompt enhancer for video generation
app.post('/api/ai/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Transform this basic video idea into a vivid, visually breathtaking video generation prompt with lighting, camera angle, and atmosphere (under 35 words): "${prompt}"`,
    });

    return res.json({ enhancedPrompt: response.text?.trim() || prompt });
  } catch (error: any) {
    console.error('Error enhancing prompt:', error);
    return res.json({ enhancedPrompt: `${req.body.prompt}, cinematic 35mm film grain, 8k golden hour light` });
  }
});

// Setup Vite middleware in dev, static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineFlow Studio server running on port ${PORT}`);
  });
}

startServer();

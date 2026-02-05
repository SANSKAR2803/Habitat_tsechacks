/**
 * AI Service - OpenAI / Google Gemini
 * REAL AI RECOMMENDATIONS ONLY
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIRecommendation {
  summary: string;
  priority_actions: string[];
  species_recommendations: string[];
  risk_assessment: string;
  timeline: string;
  confidence: number;
}

interface EnvironmentalData {
  weather: any;
  soil: any;
  species: any;
  forest: any;
  ndvi: any;
  coordinates: { lat: number; lon: number };
}

export async function generateAIRecommendation(data: EnvironmentalData): Promise<AIRecommendation> {
  const provider = process.env.AI_PROVIDER || 'openai';

  const prompt = `You are an expert forest restoration ecologist. Analyze the following environmental data and provide restoration recommendations.

Location: ${data.coordinates.lat}, ${data.coordinates.lon}

Weather Data:
- Temperature: ${data.weather.temp}°C
- Humidity: ${data.weather.humidity}%
- Rainfall: ${data.weather.rainfall}mm
- Wind: ${data.weather.wind}m/s

Soil Data:
- pH: ${data.soil.pH}
- Clay: ${data.soil.clay}%
- Sand: ${data.soil.sand}%
- Organic Carbon: ${data.soil.organic_carbon}g/kg
- Nitrogen: ${data.soil.nitrogen}g/kg

Forest Data:
- Forest Cover: ${data.forest.forest_cover}%
- Deforestation Alerts: ${data.forest.alerts}
- Tree Cover Loss: ${data.forest.tree_cover_loss}ha

Vegetation Index:
- NDVI: ${data.ndvi.ndvi}
- NDMI: ${data.ndvi.ndmi}
- EVI: ${data.ndvi.evi}

Existing Species:
${data.species.tree_species.slice(0, 10).join(', ')}

Provide a comprehensive restoration recommendation in JSON format:
{
  "summary": "Brief 2-3 sentence overview",
  "priority_actions": ["action1", "action2", "action3"],
  "species_recommendations": ["species1", "species2", "species3"],
  "risk_assessment": "Assessment of risks and challenges",
  "timeline": "Recommended timeline for restoration",
  "confidence": 0.85
}`;

  try {
    if (provider === 'openai') {
      return await generateOpenAIRecommendation(prompt);
    } else if (provider === 'gemini') {
      return await generateGeminiRecommendation(prompt);
    } else {
      throw new Error(`Unknown AI provider: ${provider}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate AI recommendation: ${error.message}`);
    }
    throw new Error('Failed to generate AI recommendation: Unknown error');
  }
}

async function generateOpenAIRecommendation(prompt: string): Promise<AIRecommendation> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert forest restoration ecologist. Provide recommendations in valid JSON format only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1000
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

async function generateGeminiRecommendation(prompt: string): Promise<AIRecommendation> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or GOOGLE_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const result = await model.generateContent(prompt + '\n\nRespond with valid JSON only.');
  const response = await result.response;
  const text = response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Gemini response');
  }

  return JSON.parse(jsonMatch[0]);
}

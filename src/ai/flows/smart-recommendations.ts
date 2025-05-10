// src/ai/flows/smart-recommendations.ts
'use server';

/**
 * @fileOverview Provides smart recommendations for local spots based on user preferences, time of day, and weather.
 *
 * - getSmartRecommendations - A function that retrieves smart recommendations.
 * - SmartRecommendationsInput - The input type for the getSmartRecommendations function.
 * - SmartRecommendationsOutput - The return type for the getSmartRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartRecommendationsInputSchema = z.object({
  userPreferences: z
    .string()
    .describe('A description of the user preferences for activities and dining.'),
  timeOfDay: z.string().describe('The current time of day (e.g., morning, afternoon, evening).'),
  weather: z.string().describe('The current weather conditions (e.g., sunny, rainy, cloudy).'),
  location: z.string().describe('The current location of the user (e.g., city, neighborhood).'),
});
export type SmartRecommendationsInput = z.infer<typeof SmartRecommendationsInputSchema>;

const SmartRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z.string().describe('The name of the recommended place.'),
      description: z.string().describe('A short description of the place.'),
      type: z.string().describe('The type of place (e.g., restaurant, museum, park).'),
      reason: z.string().describe('Why this place is recommended based on the input parameters.'),
    })
  ).describe('An array of recommended places.'),
});
export type SmartRecommendationsOutput = z.infer<typeof SmartRecommendationsOutputSchema>;

export async function getSmartRecommendations(input: SmartRecommendationsInput): Promise<SmartRecommendationsOutput> {
  return smartRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartRecommendationsPrompt',
  input: {schema: SmartRecommendationsInputSchema},
  output: {schema: SmartRecommendationsOutputSchema},
  prompt: `You are a local expert providing recommendations based on user preferences, time of day, and weather.

  Location: {{{location}}}
  User Preferences: {{{userPreferences}}}
  Time of Day: {{{timeOfDay}}}
  Weather: {{{weather}}}

  Provide a list of recommendations that match the user's preferences, are appropriate for the time of day, and suitable for the current weather conditions.
  Explain why each place is recommended based on the provided information.
  Format your output as a JSON array of recommendations.
  `,
});

const smartRecommendationsFlow = ai.defineFlow(
  {
    name: 'smartRecommendationsFlow',
    inputSchema: SmartRecommendationsInputSchema,
    outputSchema: SmartRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

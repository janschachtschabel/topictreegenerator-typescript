import { Topic, Collection, Properties } from '../types/TopicTree';
import { BASE_INSTRUCTIONS } from '../constants/prompts';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';
import { decode } from 'gpt-tokenizer';

import { getMainPromptTemplate } from '../constants/treePrompts';

export class OpenAIError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'OpenAIError';
    Object.setPrototypeOf(this, OpenAIError.prototype);
  }
}

function truncateToTokenLimit(text: string, maxTokens: number = 12000): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;
  
  const truncatedTokens = tokens.slice(0, maxTokens);
  return decode(truncatedTokens);
}

function chunkDocumentContext(context: string, maxTokens: number = 12000): string {
  // Check if context is a document with metadata containing chunks
  if (typeof context === 'object' && context.metadata?.chunks) {
    const chunks = context.metadata.chunks;
    const query = context.content.slice(0, 1000).replace(/\n+/g, ' ').trim();
    
    // Use stored relevant chunks if available
    if (context.metadata.relevantChunks) {
      return context.metadata.relevantChunks.join('\n\n');
    }
    
    // Otherwise use first 50 chunks
    return chunks.slice(0, 50).join('\n\n');
  }
  
  // Fallback to simple truncation for plain text
  const tokens = encode(context);
  if (tokens.length <= maxTokens) return context;
  
  const firstPart = decode(tokens.slice(0, maxTokens / 2));
  const lastPart = decode(tokens.slice(-maxTokens / 2));
  return `${firstPart}\n...\n${lastPart}`;
}

export { chunkDocumentContext };

export const createProperties = (
  title: string,
  shorttitle: string,
  alternative_titles?: {
    grundbildend?: string;
    allgemeinbildend?: string;
    berufsbildend?: string;
    akademisch?: string;
  },
  description: string,
  keywords: string[],
  disciplineUri: string = "",
  educationalContextUri: string = ""
): Properties => ({
  ccm_collectionshorttitle: [shorttitle],
  ccm_taxonid: [disciplineUri || "http://w3id.org/openeduhub/vocabs/discipline/460"],
  cm_title: [title],
  cm_alternative_titles: alternative_titles || {
    grundbildend: title,
    allgemeinbildend: title,
    berufsbildend: title,
    akademisch: title
  },
  ccm_educationalintendedenduserrole: ["http://w3id.org/openeduhub/vocabs/intendedEndUserRole/teacher"],
  ccm_educationalcontext: [educationalContextUri || "http://w3id.org/openeduhub/vocabs/educationalContext/sekundarstufe_1"],
  cm_description: [description],
  cclom_general_keyword: Array.isArray(keywords) ? keywords : []
});

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let lastGroqCallTime = 0;
let groqCallCount = 0;
const GROQ_WINDOW_SIZE = 60000; // 1 minute in milliseconds
const GROQ_MAX_CALLS = 30;
const groqCallTimes: number[] = [];

async function enforceGroqRateLimit() {
  const now = Date.now();
  
  // Remove calls older than 1 minute
  while (groqCallTimes.length > 0 && groqCallTimes[0] < now - GROQ_WINDOW_SIZE) {
    groqCallTimes.shift();
  }

  // If we've hit the limit, wait until oldest call expires
  if (groqCallTimes.length >= GROQ_MAX_CALLS) {
    const oldestCall = groqCallTimes[0];
    const waitTime = oldestCall + GROQ_WINDOW_SIZE - now;
    
    if (waitTime > 0) {
      window.dispatchEvent(new CustomEvent('generationStatus', { 
        detail: `Groq Rate Limit erreicht. Warte ${Math.ceil(waitTime/1000)} Sekunden...`
      }));
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return enforceGroqRateLimit(); // Recheck after waiting
    }
  }

  // Add current call time
  groqCallTimes.push(now);

  // Ensure minimum 2 second gap between calls
  const timeSinceLastCall = now - lastGroqCallTime;
  if (timeSinceLastCall < 2000) {
    const waitTime = 2000 - timeSinceLastCall;
    window.dispatchEvent(new CustomEvent('generationStatus', { 
      detail: `Warte ${Math.ceil(waitTime/1000)}s zwischen Anfragen...`
    }));
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastGroqCallTime = Date.now();
}

function resetGroqRateLimit() {
  groqCallTimes.length = 0;
  lastGroqCallTime = 0;
  groqCallCount = 0;
}

export const generateStructuredText = async (
  apiKey: string,
  prompt: string,
  model: string,
  baseUrl: string = 'https://api.openai.com/v1'
): Promise<Topic[]> => {
  try {
    if (!apiKey) {
      throw new OpenAIError('API Key fehlt. Bitte geben Sie einen API Key in den Einstellungen ein.');
    }

    // Truncate prompt if too long
    const truncatedPrompt = truncateToTokenLimit(prompt);
    if (truncatedPrompt !== prompt) {
      window.dispatchEvent(new CustomEvent('generationStatus', { 
        detail: 'Prompt wurde gekürzt, um die Token-Grenze einzuhalten...'
      }));
    }

    // Initialize OpenAI client with custom base URL
    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
      timeout: 60000,
      maxRetries: 3
    });

    const makeRequest = async (retries = 3): Promise<any> => {
      try {
        let completion;
        let parseAttempt = 0;
        const maxParseAttempts = 3;

        while (parseAttempt < maxParseAttempts) {
          try {
            window.dispatchEvent(new CustomEvent('generationStatus', { 
              detail: 'Sende Anfrage an API...'
            }));

            // Enforce rate limit for Groq
            if (baseUrl.includes('groq.com')) {
              await enforceGroqRateLimit();
            }

            // Configure request parameters based on model
            const requestParams: any = {
              model,
              messages: [
                { role: 'system', content: BASE_INSTRUCTIONS },
                { role: 'user', content: truncatedPrompt }
              ]
            };

            // Add model-specific parameters
            if (model === 'o3-mini') {
              requestParams.max_completion_tokens = 50000;
            } else {
              requestParams.max_tokens = 12000;
              requestParams.temperature = 0.7 + (parseAttempt * 0.1);
            }

            completion = await openai.chat.completions.create(requestParams);

            window.dispatchEvent(new CustomEvent('generationStatus', { 
              detail: 'Antwort von API erhalten, verarbeite Ergebnis...'
            }));

            if (!completion?.choices[0]?.message?.content) {
              throw new OpenAIError('Keine gültige Antwort vom API-Server erhalten');
            }

            const content = completion.choices[0].message.content.trim();

            try {
              // Clean and parse the response
              const cleanedContent = content
                .replace(/```json\n?|\n?```/g, '')
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/^\s*\[|\]\s*$/g, '')
                .trim();

              const wrappedContent = cleanedContent.startsWith('[') ? cleanedContent : `[${cleanedContent}]`;
              const parsed = JSON.parse(wrappedContent);

              // Validate structure
              const validTopics = parsed.filter((item: any) => 
                item &&
                typeof item === 'object' &&
                typeof item.title === 'string' &&
                typeof item.shorttitle === 'string' &&
                (item.alternative_titles === undefined || (
                  typeof item.alternative_titles === 'object' &&
                  Object.entries(item.alternative_titles).every(
                    ([key, value]) => 
                      ['grundbildend', 'allgemeinbildend', 'berufsbildend', 'akademisch'].includes(key) &&
                      typeof value === 'string'
                  )
                )) &&
                typeof item.description === 'string' &&
                Array.isArray(item.keywords)
              );

              if (validTopics.length === 0) {
                throw new Error('Keine gültigen Themen in der Antwort');
              }

              // Return validated topics with default alternative titles if needed
              return validTopics.map(topic => ({
                ...topic,
                alternative_titles: topic.alternative_titles || {
                  grundbildend: topic.title,
                  allgemeinbildend: topic.title,
                  berufsbildend: topic.title,
                  akademisch: topic.title
                }
              }));
            } catch (parseError) {
              console.error('Parse error:', parseError);
              parseAttempt++;
              
              if (parseAttempt >= maxParseAttempts) {
                throw new OpenAIError(
                  'Die API-Antwort konnte nicht verarbeitet werden. ' +
                  'Bitte versuchen Sie es erneut oder wählen Sie ein anderes Modell.'
                );
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000 * parseAttempt));
              continue;
            }
          } catch (apiError) {
            console.error('API error:', apiError);
            
            if (apiError instanceof OpenAI.APIError) {
              // Handle Groq-specific errors
              if (baseUrl.includes('groq.com')) {
                if (apiError.status === 429) {
                  resetGroqRateLimit(); // Reset state on rate limit error
                  throw new OpenAIError(
                    'Groq Rate Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.',
                    apiError.status
                  );
                }
                if (apiError.status === 400) {
                  if (apiError.message.includes('logprobs') || 
                      apiError.message.includes('logit_bias') || 
                      apiError.message.includes('top_logprobs') || 
                      apiError.message.includes('name')) {
                    throw new OpenAIError(
                      'Groq unterstützt einige erweiterte Optionen nicht. ' +
                      'Bitte verwenden Sie die Standardeinstellungen.',
                      apiError.status
                    );
                  }
                }
              }

              // Generic error handling
              throw new OpenAIError(
                apiError.status === 401 
                  ? 'Der API Key ist ungültig oder abgelaufen. Bitte überprüfen Sie Ihre Eingabe.'
                  : apiError.status === 408 || apiError.message.includes('timeout')
                  ? 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.'
                  : apiError.status === 404
                  ? 'Das ausgewählte Modell ist nicht verfügbar. Bitte wählen Sie ein anderes Modell.'
                  : apiError.status === 429
                  ? 'Rate Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.'
                  : apiError.status === 500
                  ? 'Server-Fehler. Bitte versuchen Sie es später erneut.'
                  : apiError.status === 503
                  ? 'Service temporär nicht verfügbar. Bitte versuchen Sie es später erneut.'
                  : `API Fehler: ${apiError.message}`,
                apiError.status
              );
            }
            throw apiError;
          }
        }
        
        throw new OpenAIError('Maximale Anzahl an Versuchen erreicht');
      } catch (error) {
        console.error('Request error:', error);
        
        if (retries > 0 && !(error instanceof OpenAIError)) {
          window.dispatchEvent(new CustomEvent('generationStatus', { 
            detail: `Fehler aufgetreten. Wiederhole Anfrage (${retries} Versuche übrig)...`
          }));
          await new Promise(resolve => setTimeout(resolve, 2000));
          return makeRequest(retries - 1);
        }
        throw error;
      }
    };

    return await makeRequest();
  } catch (error) {
    console.error('Generation error:', error);
    
    if (error instanceof OpenAIError) {
      throw error;
    }
    
    throw new OpenAIError(
      error instanceof Error 
        ? error.message 
        : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.'
    );
  }
};
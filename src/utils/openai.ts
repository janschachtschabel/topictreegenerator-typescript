import { Topic, Collection, Properties } from '../types/TopicTree';
import { BASE_INSTRUCTIONS } from '../constants/prompts';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

// Import decode function from gpt-tokenizer
import { decode } from 'gpt-tokenizer';

export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}

function truncateToTokenLimit(text: string, maxTokens: number = 12000): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;
  
  const truncatedTokens = tokens.slice(0, maxTokens);
  return decode(truncatedTokens);
}

function chunkDocumentContext(context: string, maxTokens: number = 12000): string {
  const tokens = encode(context);
  if (tokens.length <= maxTokens) return context;

  // Take first and last part of the context to maintain relevance
  const firstPart = decode(tokens.slice(0, maxTokens / 2));
  const lastPart = decode(tokens.slice(-maxTokens / 2));

  return `${firstPart}\n...\n${lastPart}`;
}

// Export the chunking function
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

export const generateStructuredText = async (
  apiKey: string,
  prompt: string,
  model: 'gpt-4o-mini' | 'gpt-4o'
): Promise<Topic[]> => {
  try {
    if (!apiKey) {
      console.error('API Key fehlt');
      throw new OpenAIError('OpenAI API Key fehlt. Bitte geben Sie einen API Key in den Einstellungen ein.');
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('Ungültiges API Key Format');
      throw new OpenAIError('Der API Key ist ungültig. Er muss mit "sk-" beginnen.');
    }

    // Korrekte Modellnamen für die OpenAI API
    const modelMapping = {
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o'
    };

    const apiModel = modelMapping[model];
    if (!apiModel) {
      throw new OpenAIError('Ungültiges Modell ausgewählt');
    }

    // Truncate prompt if too long
    const truncatedPrompt = truncateToTokenLimit(prompt);
    if (truncatedPrompt !== prompt) {
      console.warn('Prompt was truncated to fit token limit');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      timeout: 60000, // Increase timeout to 60 seconds
      maxRetries: 3
    });

    const makeRequest = async (retries = 3): Promise<any> => {
      try {
        let completion;
        let parseAttempt = 0;
        const maxParseAttempts = 3;

        while (parseAttempt < maxParseAttempts) {
          if (parseAttempt > 0) {
            console.log(`Parsing-Fehler aufgetreten. Wiederhole Anfrage (Versuch ${parseAttempt + 1} von ${maxParseAttempts})...`);
            // Update status in TopicForm
            window.dispatchEvent(new CustomEvent('generationStatus', { 
              detail: `Parsing-Fehler aufgetreten. Wiederhole Anfrage (Versuch ${parseAttempt + 1} von ${maxParseAttempts})...`
            }));
          }

          completion = await openai.chat.completions.create({
            model: apiModel,
            messages: [
              { role: 'system', content: BASE_INSTRUCTIONS },
              { role: 'user', content: truncatedPrompt }
            ],
            max_tokens: 12000,
            temperature: 0.7 + (parseAttempt * 0.1) // Slightly increase temperature on retries
          });

          if (!completion.choices[0]?.message?.content) {
            throw new OpenAIError('Keine gültige Antwort von der OpenAI API erhalten');
          }

          const content = completion.choices[0].message.content.trim();
          console.log(`Rohantwort von OpenAI (Versuch ${parseAttempt + 1}):`, content);

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
            console.error(`Parsing-Fehler bei Versuch ${parseAttempt + 1}:`, parseError);
            parseAttempt++;
            
            if (parseAttempt >= maxParseAttempts) {
              throw new Error('Konnte keine gültige JSON-Struktur erzeugen nach mehreren Versuchen');
            }
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * parseAttempt));
            continue;
          }
        }
        
        throw new Error('Maximale Anzahl an Parse-Versuchen erreicht');
      } catch (error) {
        if (retries > 0) {
          console.log(`Request failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          return makeRequest(retries - 1);
        }
        throw error;
      }
    };

    try {
      return await makeRequest();
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const message = error.status === 401 
          ? 'Der API Key ist ungültig. Bitte überprüfen Sie Ihre Eingabe.'
          : error.status === 408 || error.message.includes('timeout')
          ? 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.'
          : error.status === 404
          ? 'Das ausgewählte Modell ist nicht verfügbar. Bitte wählen Sie ein anderes Modell.'
          : error.status === 429
          ? 'Rate Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.'
          : error.status === 500
          ? 'OpenAI Server-Fehler. Bitte versuchen Sie es später erneut.'
          : error.status === 503
          ? 'OpenAI Service temporär nicht verfügbar. Bitte versuchen Sie es später erneut.'
          : `OpenAI API Fehler: ${error.message}`;
        throw new OpenAIError(message);
      } else if (error instanceof OpenAIError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        console.error('Detailed error:', error);
        throw new OpenAIError(
          `Fehler bei der Textgenerierung: ${errorMessage}. ` +
          'Bitte versuchen Sie es erneut. Falls der Fehler weiterhin besteht, ' +
          'überprüfen Sie Ihre Internetverbindung und den API-Key.'
        );
      }
    }
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(`Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
};
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
  description: string,
  keywords: string[],
  disciplineUri: string = "",
  educationalContextUri: string = ""
): Properties => ({
  ccm_collectionshorttitle: [shorttitle],
  ccm_taxonid: disciplineUri ? [disciplineUri] : ["http://w3id.org/openeduhub/vocabs/discipline/460"],
  cm_title: [title],
  ccm_educationalintendedenduserrole: ["http://w3id.org/openeduhub/vocabs/intendedEndUserRole/teacher"],
  ccm_educationalcontext: educationalContextUri 
    ? [educationalContextUri] 
    : ["http://w3id.org/openeduhub/vocabs/educationalContext/sekundarstufe_1"],
  cm_description: [description],
  cclom_general_keyword: keywords
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
      timeout: 30000,
      maxRetries: 3
    });

    try {
      const completion = await openai.chat.completions.create({
        model: apiModel,
        messages: [
          { role: 'system', content: BASE_INSTRUCTIONS },
          { role: 'user', content: truncatedPrompt }
        ],
        max_tokens: 12000,
        temperature: 0.7
      });

      if (!completion.choices[0]?.message?.content) {
        throw new OpenAIError('Keine gültige Antwort von der OpenAI API erhalten');
      }
      
      const content = completion.choices[0].message.content.trim();
      console.log('Rohantwort von OpenAI:', content);
    
      // Bereinige die Antwort von Markdown und Formatierung
      const cleanedContent = content
        .replace(/```json\n?|\n?```/g, '')  // Entferne Markdown Code-Blocks
        .replace(/[\u201C\u201D]/g, '"')    // Ersetze typografische Anführungszeichen
        .replace(/^\s*\[|\]\s*$/g, '')      // Entferne äußere Klammern falls vorhanden
        .trim();

      // Stelle sicher, dass wir ein Array haben
      const wrappedContent = cleanedContent.startsWith('[') ? cleanedContent : `[${cleanedContent}]`;

      try {
        // Parse and validate the JSON
        const parsed = JSON.parse(wrappedContent);

        // Validiere die Struktur
        const validTopics = parsed.filter((item: any) => 
          item &&
          typeof item === 'object' &&
          typeof item.title === 'string' &&
          typeof item.shorttitle === 'string' &&
          typeof item.description === 'string' &&
          Array.isArray(item.keywords)
        );

        if (validTopics.length === 0) {
          throw new OpenAIError('Die API-Antwort enthält keine gültigen Themen');
        }

        return validTopics;        
      } catch (parseError) {
        console.error('Parsing error:', parseError);
        console.log('Raw content:', content);

        // Versuche alternative Parsing-Strategien
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {            
            const extracted = jsonMatch[0];
            const parsed = JSON.parse(extracted);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch (e) {
            console.error('Alternative parsing failed:', e);
          }          
        }
        
        throw new OpenAIError('Die API-Antwort konnte nicht als gültiges JSON interpretiert werden');        
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const message = error.status === 401 
          ? 'Der API Key ist ungültig. Bitte überprüfen Sie Ihre Eingabe.'
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
        throw new OpenAIError(`Fehler bei der Textgenerierung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(`Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
};
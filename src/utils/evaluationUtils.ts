import { TopicTree } from '../types/TopicTree';
import { generateAsciiTree } from './treeUtils';
import OpenAI from 'openai';
import { BASE_INSTRUCTIONS } from '../constants/prompts';
import { EVALUATION_CRITERIA, EVALUATION_PROMPT, RECOMMENDATIONS_PROMPT } from '../constants/evaluationPrompts';

export class EvaluationError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'EvaluationError';
    Object.setPrototypeOf(this, EvaluationError.prototype);
  }
}

export interface EvaluationCriterion {
  name: string;
  score: number;
  description: string;
  feedback: string;
}

async function generateEvaluation(
  apiKey: string,
  prompt: string,
  model: string,
  baseUrl: string
): Promise<any[]> {
  try {
    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
      timeout: 60000,
      maxRetries: 2
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: BASE_INSTRUCTIONS },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 12000
    });

    if (!completion?.choices[0]?.message?.content) {
      throw new EvaluationError('Keine gültige Antwort vom API-Server erhalten');
    }

    const content = completion.choices[0].message.content.trim();
    
    // Only parse as JSON if the prompt expects JSON
    if (prompt.includes('Formatiere die Antwort als JSON')) {
      const cleanedJson = cleanJsonString(content);
      return JSON.parse(cleanedJson);
    }
    
    return content;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new EvaluationError(
        error.status === 401 ? 'API Key ungültig' :
        error.status === 429 ? 'Rate Limit erreicht' :
        error.status === 500 ? 'API Server Fehler' :
        'API Fehler: ' + error.message,
        error.status
      );
    }
    throw error;
  }
}

function cleanJsonString(str: string): string {
  try {
    // Remove any non-JSON content
    let cleaned = str
      // Remove everything before first [ and after last ]
      .replace(/^[\s\S]*?(\[[\s\S]*?\])[\s\S]*$/, '$1')
      // Remove code blocks
      .replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1')
      // Remove newlines and extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Fix common JSON issues
    cleaned = cleaned
      // Fix property names
      .replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\:/g, '$1"$2":')
      // Fix single quotes
      .replace(/'/g, '"')
      // Fix smart quotes
      .replace(/[\u2018\u2019]/g, '"')
      .replace(/[\u201C\u201D]/g, '"')
      // Fix missing quotes around string values
      .replace(/:\s*([^"{}\[\],\s][^{}\[\],]*[^"{}\[\],\s])\s*(,|})/g, ':"$1"$2')
      // Fix trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Fix missing commas between objects
      .replace(/}(\s*){/g, '},{')
      // Fix decimal numbers
      .replace(/(\d+)\.(\d+)/g, (match) => match.replace('.', '.'));

    // Ensure array structure
    if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
    if (!cleaned.endsWith(']')) cleaned = cleaned + ']';

    // Parse to validate and re-stringify to normalize
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error cleaning JSON string:', error);
    throw new Error('Ungültiges JSON-Format in der API-Antwort');
  }
}

function validateCriterion(criterion: any, index: number): EvaluationCriterion {
  // Get expected criterion
  const expectedCriterion = EVALUATION_CRITERIA[index];
  if (!expectedCriterion) {
    throw new Error(`Kein erwartetes Kriterium für Index ${index}`);
  }

  if (!criterion || typeof criterion !== 'object') {
    throw new Error(`Ungültiges Kriterium für "${expectedCriterion.name}"`);
  }

  // Validate name matches expected
  if (criterion.name !== expectedCriterion.name) {
    throw new Error(
      `Kriteriumsname "${criterion.name}" stimmt nicht mit erwartetem Namen "${expectedCriterion.name}" überein`
    );
  }

  // Validate score
  let score: number;
  if (typeof criterion.score === 'number' && !isNaN(criterion.score)) {
    score = Math.round(criterion.score * 2) / 2; // Round to nearest 0.5
  } else if (typeof criterion.score === 'string') {
    const parsedScore = parseFloat(criterion.score);
    if (isNaN(parsedScore)) {
      throw new Error(`Ungültiger Score für "${expectedCriterion.name}": ${criterion.score}`);
    }
    score = Math.round(parsedScore * 2) / 2;
  } else {
    throw new Error(`Fehlender oder ungültiger Score für "${expectedCriterion.name}"`);
  }

  // Ensure score is within valid range
  if (score < 1 || score > 5) {
    throw new Error(
      `Score ${score} für "${expectedCriterion.name}" außerhalb des gültigen Bereichs (1-5)`
    );
  }

  // Validate feedback
  if (!criterion.feedback || typeof criterion.feedback !== 'string' || criterion.feedback.trim().length < 10) {
    throw new Error(`Ungültiges oder zu kurzes Feedback für "${expectedCriterion.name}"`);
  }

  return {
    name: expectedCriterion.name,
    score,
    description: expectedCriterion.description,
    feedback: criterion.feedback.trim()
  };
}

async function retryEvaluation(
  tree: TopicTree, 
  apiKey: string, 
  model: string, 
  baseUrl: string,
  evaluationSource: string = 'json',
  maxRetries: number = 3
): Promise<{ criteria: EvaluationCriterion[], rawResponse: string, rawPrompt: string }> {
  let lastError: Error | null = null;
  let attempt = 1;
  
  while (attempt <= maxRetries) {
    try {
      // Generate tree representation based on source
      let treeRepresentation: string;
      if (evaluationSource === 'json') {
        treeRepresentation = JSON.stringify(tree, null, 2);
      } else {
        const sector = evaluationSource.replace('ascii-', '');
        treeRepresentation = generateAsciiTree(tree, sector);
      }

      const prompt = EVALUATION_PROMPT.replace('{tree}', treeRepresentation);
      
      // Get evaluation from OpenAI
      const response = await generateEvaluation(apiKey, prompt, model, baseUrl);
      
      // Clean and parse the response
      const rawResponse = Array.isArray(response) ? JSON.stringify(response) : String(response);
      const cleanedJson = cleanJsonString(rawResponse);
      const parsedResponse = JSON.parse(cleanedJson);
      
      // Validate response is an array
      if (!Array.isArray(parsedResponse)) {
        throw new Error('API-Antwort ist kein Array');
      }

      // Validate array length
      if (parsedResponse.length !== EVALUATION_CRITERIA.length) {
        throw new Error(
          `Ungültige Anzahl an Kriterien: ${parsedResponse.length} (${EVALUATION_CRITERIA.length} erwartet)`
        );
      }
      
      // Validate each criterion
      const validatedCriteria = parsedResponse.map(validateCriterion);
      
      return {
        criteria: validatedCriteria,
        rawResponse,
        rawPrompt: prompt
      };
    } catch (error) {
      console.error(`Evaluation attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      
      break;
    }
  }
  
  throw lastError || new EvaluationError('Evaluation failed after multiple attempts');
}

async function generateDetailedRecommendations(
  tree: TopicTree,
  evaluationResults: any,
  apiKey: string,
  model: string,
  baseUrl: string,
  evaluationSource: string = 'json'
): Promise<string> {
  // Generate tree representation
  const treeRepresentation = evaluationSource === 'json' 
    ? JSON.stringify(tree, null, 2)
    : generateAsciiTree(tree, evaluationSource.replace('ascii-', ''));

  // Create prompt with evaluation results
  const prompt = RECOMMENDATIONS_PROMPT
    .replace('{tree}', treeRepresentation)
    .replace('{evaluation_results}', JSON.stringify(evaluationResults, null, 2));

  try {
    const recommendations = await generateEvaluation(apiKey, prompt, model, baseUrl);
    return typeof recommendations === 'string' ? recommendations : JSON.stringify(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw new Error('Fehler bei der Generierung der detaillierten Empfehlungen');
  }
}

export async function evaluateTopicTree(tree: TopicTree, evaluationSource: string = 'json') {
  try {
    // Get API settings from localStorage
    const apiKey = localStorage.getItem('apiKey');
    const model = localStorage.getItem('model') || 'gpt-4o-mini';
    const baseUrl = localStorage.getItem('baseUrl') || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('API Key fehlt. Bitte geben Sie einen API Key in den KI-Einstellungen ein.');
    }

    const { criteria, rawResponse, rawPrompt } = await retryEvaluation(
      tree, 
      apiKey, 
      model, 
      baseUrl, 
      evaluationSource
    );
    
    // Generate detailed recommendations
    const detailedRecommendations = await generateDetailedRecommendations(
      tree,
      criteria,
      apiKey,
      model,
      baseUrl,
      evaluationSource
    );

    // Calculate overall score
    const overallScore = Math.round(
      (criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length) * 2
    ) / 2;

    // Generate summary from criteria
    const strengths = criteria.filter(c => c.score >= 4);
    const weaknesses = criteria.filter(c => c.score <= 3);

    const summary = `Der Themenbaum erreicht eine Gesamtbewertung von ${overallScore} von 5 Punkten. ` +
      (strengths.length > 0 
        ? `Besonders stark ist der Baum in ${strengths.map(c => c.name).join(', ')}. `
        : '') +
      (weaknesses.length > 0
        ? `Verbesserungspotential besteht bei ${weaknesses.map(c => c.name).join(', ')}.`
        : '');

    return {
      criteria,
      overallScore,
      summary,
      recommendations: detailedRecommendations,
      rawResponse,
      rawPrompt
    };
  } catch (error) {
    console.error('Evaluation error:', error);
    throw error instanceof Error
      ? error 
      : new EvaluationError('Fehler bei der Evaluation des Themenbaums');
  }
}
import * as pdfjsLib from 'pdfjs-dist';
import { pipeline, env, type Pipeline, type PipelineType } from '@xenova/transformers';
import { supabase } from './supabase';

// Configure Transformers.js with more conservative settings
env.backends.onnx.wasm.numThreads = 1;
env.useBrowserCache = false;  // Disable browser cache to prevent stale models
env.allowLocalModels = false; // Ensure we always download fresh models

let embeddingPipeline: Pipeline | null = null;
let isInitializing = false;
let initializationError: Error | null = null;
let initializationPromise: Promise<Pipeline> | null = null;

// Initialize PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

async function getEmbeddingPipeline() {
  if (initializationError) {
    resetEmbeddingPipeline();
  }

  // Return existing pipeline if available
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // Return existing initialization promise if one is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  if (!isInitializing) {
    isInitializing = true;
    console.log('Starting pipeline initialization...');
    
    const initializeWithRetry = async (retries = 3): Promise<Pipeline> => {
      try {
        console.log('Initializing embedding pipeline...');
        const pipe = await pipeline(
          'feature-extraction' as PipelineType,
          'Xenova/all-MiniLM-L6-v2',
          {
            revision: 'main',
            quantized: true,
            cache_dir: '/tmp/transformers_cache',
            progress_callback: progress => {
              console.log(`Loading model: ${Math.round(progress.progress * 100)}%`);
            }
          }
        );
        console.log('Embedding pipeline initialized successfully');
        
        // Warm up the pipeline with a test input
        try {          
          await pipe('Test text', { pooling: 'mean', normalize: true });
          console.log('Pipeline warm-up successful');
        } catch (warmupError) {
          console.warn('Pipeline warm-up failed:', warmupError);
        }
        
        embeddingPipeline = pipe;
        return pipe;
      } catch (error) {
        console.error(`Pipeline initialization attempt failed (${retries} retries left):`, error);
        
        if (retries > 0) {
          console.log(`Retrying pipeline initialization in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return initializeWithRetry(retries - 1);
        }
        
        const errorMessage = error instanceof Error 
          ? `Embedding-Modell konnte nicht geladen werden: ${error.message}` 
          : 'Embedding-Modell konnte nicht geladen werden';
          
        throw new Error(
          errorMessage + 
          '\nBitte laden Sie die Seite neu und versuchen Sie es erneut. ' +
          'Stellen Sie sicher, dass Sie eine stabile Internetverbindung haben.'
        );
      }
    };

    initializationPromise = initializeWithRetry().then(result => {
      isInitializing = false;
      initializationPromise = null;
      return result;
    }).catch(error => {
      isInitializing = false;
      initializationPromise = null;
      initializationError = error;
      throw error;
    });

    return initializationPromise;
  } 
  
  throw new Error('Unexpected pipeline initialization state');
}

function resetEmbeddingPipeline() {
  embeddingPipeline = null;
  initializationError = null;
  isInitializing = false;
  initializationPromise = null;
}

async function generateEmbedding(text: string): Promise<Float32Array> {
  if (!text?.trim()) throw new Error('Empty text provided for embedding');
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pipe = await getEmbeddingPipeline();
      
      if (!pipe) {
        throw new Error('Pipeline initialization failed');
      }

      const result = await pipe(text.slice(0, 512), {
        pooling: 'mean',
        normalize: true,
        add_special_tokens: true,
        padding: true,
        truncation: true
      });
      return result.data instanceof Float32Array ? result.data : new Float32Array(result.data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('undefined')) {
        console.error('Pipeline returned undefined result:', error);
        resetEmbeddingPipeline();
        throw new Error('Pipeline initialization failed. Please try again.');
      } 
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Embedding attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`Retrying... (${attempt}/${maxRetries})`);
        resetEmbeddingPipeline(); // Reset pipeline before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(
    `Fehler bei der Textverarbeitung nach ${maxRetries} Versuchen: ${lastError?.message}`
    + '\nBitte laden Sie die Seite neu und versuchen Sie es erneut. Wenn das Problem weiterhin besteht, versuchen Sie es mit einem anderen Browser.');
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ');
      fullText += pageText + '\n';
    }
    
    if (!fullText.trim()) {
      throw new Error('Keine Textinhalte im PDF gefunden');
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF Verarbeitungsfehler:', error);
    throw new Error(
      error instanceof Error 
        ? `PDF konnte nicht verarbeitet werden: ${error.message}`
        : 'PDF konnte nicht verarbeitet werden'
    );
  }
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import('mammoth');
  const result = await mammoth.default.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromRTF(file: File): Promise<string> {
  const text = await file.text();
  return text.replace(/[{}\\]|\\\w+\s?/g, '');
}

function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let overlapBuffer: string[] = [];

  for (const word of words) {
    if (currentLength + word.length > chunkSize) {
      // Add overlap from previous chunk
      if (overlapBuffer.length > 0) {
        currentChunk.unshift(...overlapBuffer);
      }
      chunks.push(currentChunk.join(' '));
      
      // Keep last words for overlap
      const wordsForOverlap = currentChunk.slice(-Math.ceil(overlap / 10)); // Approximate words for overlap
      overlapBuffer = wordsForOverlap;
      
      currentChunk = [word]; 
      currentLength = word.length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

async function findRelevantChunks(chunks: string[], query: string, numChunks: number = 50): Promise<string[]> {
  try {
    // Generate embedding for the query
    console.log('Generating query embedding...');
    const queryEmbedding = await generateEmbedding(query);
    
    // Generate embeddings for all chunks
    const chunkEmbeddings: Float32Array[] = [];
    const successfulChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        console.log(`Generating chunk embedding ${i + 1}/${chunks.length}...`);
        const embedding = await generateEmbedding(chunk);
        chunkEmbeddings.push(embedding);
        successfulChunks.push(chunk);
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i + 1}:`, error);
      }
    }
    
    if (chunkEmbeddings.length === 0) {
      console.warn('No embeddings generated, falling back to first chunks');
      return chunks.slice(0, numChunks);
    }
    
    // Calculate similarities
    const similarities = chunkEmbeddings.map(embedding => 
      cosineSimilarity(queryEmbedding, embedding)
    );
    
    // Get indices of top N similar chunks
    const indices = similarities
      .map((sim, idx) => ({ sim, idx }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, numChunks)
      .map(item => item.idx)
      .sort((a, b) => a - b); // Sort by original order
    
    // Return the most relevant chunks in original order
    return indices.map(idx => successfulChunks[idx]);
  } catch (error) {
    console.error('Error in findRelevantChunks:', error);
    // Fallback to first N chunks if embedding fails
    return chunks.slice(0, numChunks);
  } 
}

export async function processDocument(file: File): Promise<string> {
  try {
    let text: string;
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('Bitte melden Sie sich an, um Dokumente zu verarbeiten');
    }

    switch (file.type) {
      case 'application/pdf':
        console.log('Verarbeite PDF:', file.name);
        text = await extractTextFromPDF(file);
        console.log('PDF Text extrahiert:', text.slice(0, 100) + '...');
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await extractTextFromDOCX(file);
        break;
      case 'text/rtf':
        text = await extractTextFromRTF(file);
        break;
      case 'text/plain':
        text = await file.text();
        break;
      default:
        throw new Error('Nicht unterstütztes Dateiformat');
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('Keine Textinhalte gefunden');
    }

    // Split text into overlapping chunks
    const chunks = splitTextIntoChunks(text, 1000, 200);
    
    // Use first 1000 characters as query context
    const queryContext = text.slice(0, 1000).replace(/\n+/g, ' ').trim();
    
    // Initialize pipeline early
    await getEmbeddingPipeline();
    
    // Find most relevant chunks for initial display
    const relevantChunks = await findRelevantChunks(chunks, queryContext, 100);
    
    // Store document in Supabase with both full text and chunks
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        title: file.name,
        content: text, // Store complete text
        file_type: file.type,
        user_id: user.data.user.id,
        metadata: {
          original_size: file.size,
          processing_date: new Date().toISOString(),
          chunks: chunks, // Store all chunks in metadata
          relevantChunks: relevantChunks // Store initially relevant chunks
        }
      });

    if (insertError) {
      console.error('Error storing document:', insertError);
      throw new Error('Dokument konnte nicht gespeichert werden');
    }

    // Return relevant chunks for display
    return relevantChunks.join('\n\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Fehler bei der Dokumentenverarbeitung:', {
      error,
      errorMessage,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error instanceof Error ? error : new Error(
      `Fehler bei der Verarbeitung von ${file.name}: ${
        errorMessage.includes('PDF') 
          ? 'PDF konnte nicht gelesen werden. Bitte stellen Sie sicher, dass die Datei nicht beschädigt ist.'
          : errorMessage
      }`);
  }
}
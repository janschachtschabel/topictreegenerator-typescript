import * as pdfjsLib from 'pdfjs-dist';
import { pipeline, env, type Pipeline, type PipelineType } from '@xenova/transformers';
import { supabase } from './utils/supabase';
import { useState, useEffect, ReactNode } from 'react';
import { Loader2, Trash2, LogOut, Settings, FileText, Eye } from 'lucide-react';
import { Auth } from './components/Auth';
import TopicForm from './components/TopicForm';
import TreeView from './components/TreeView';
import type { TopicTree, Collection } from './types/TopicTree';

type View = 'generate' | 'preview';

interface TabProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function Tab({ icon, label, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive 
          ? 'bg-indigo-100 text-indigo-700' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
}

// Configure Transformers.js with more conservative settings
env.backends.onnx.wasm.numThreads = 1;
env.useBrowserCache = false;  // Disable browser cache to prevent stale models
env.allowLocalModels = false; // Ensure we always download fresh models

let embeddingPipeline: Pipeline | null = null;
let isInitializing = false;
let initializationError: Error | null = null;
let initializationPromise: Promise<Pipeline> | null = null;

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

async function findRelevantChunks(chunks: string[], query: string, numChunks: number = 5): Promise<string[]> {
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
    return indices.map(idx => chunks[idx]);
  } catch (error) {
    console.error('Error in findRelevantChunks:', error);
    console.error('Error finding relevant chunks:', error);
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
    
    // Find most relevant chunks using embeddings
    const relevantChunks = await findRelevantChunks(chunks, queryContext, 5);
    const processedContent = relevantChunks.join('\n\n');
    
    // Store document in Supabase
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        title: file.name,
        content: processedContent,
        file_type: file.type,
        user_id: user.data.user.id,
        metadata: {
          original_size: file.size,
          processing_date: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('Error storing document:', insertError);
      throw new Error('Dokument konnte nicht gespeichert werden');
    }
    return processedContent;
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

export default function App() {
  const [showAISettings, setShowAISettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [tree, setTree] = useState<TopicTree | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrees, setIsLoadingTrees] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentView, setCurrentView] = useState<View>('generate');
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const [savedTrees, setSavedTrees] = useState<Array<{
    id: string;
    title: string;
    created_at: string;
  }>>([]);

  // Check for existing session
  useEffect(() => {
    const initAuth = async () => {
      // Clear any stale error states
      setLoadError(null);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          return;
        }
        
        // Only set user if we have valid session data
        if (session?.user) {
          console.log('Valid session found');
          setUser(session.user);
        } else {
          console.log('No active session');
          setUser(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || event === 'TOKEN_REFRESHED') {
              // Clear any application data
              setSavedTrees([]);
              setTree(null);
              setLoadError(null);
            }
            
            // Only update user if we have valid session data
            if (session?.user) {
              setUser(session.user);
            } else {
              setUser(null);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear all state on error
        setUser(null);
        setSavedTrees([]);
        setTree(null);
        setLoadError('Fehler bei der Authentifizierung');
      }
    };

    void initAuth();
  }, []); // Only run on mount

  // Load saved trees when user logs in
  useEffect(() => {
    if (user) {
      setLoadError(null);
      void loadSavedTrees();
    }
  }, [user]);

  const loadSavedTrees = async () => {
    if (isLoadingTrees) return;
    setIsLoadingTrees(true);
    setLoadError(null);

    try {
      // Check if we have a valid session first
      const sessionResponse = await supabase.auth.getSession();
      const sessionData = sessionResponse.data;
      const sessionError = sessionResponse.error;
      
      if (sessionError || !sessionData?.session) {
        console.warn('No valid session:', { sessionError, sessionData });
        setUser(null);
        setIsLoadingTrees(false);
        return;
      }

      const session = sessionData.session;
      console.log('Session valid, loading trees for user:', session.user.id);

      const response = await supabase
        .from('topic_trees')
        .select('id, title, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      const { data: trees, error } = response;
      
      // Log the full response for debugging
      console.log('Supabase response:', { response, trees, error });

      if (error) {
        console.error('Fehler beim Laden der Themenbäume:', error);
        
        // Check for network-related errors
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') || 
            error.message?.includes('network') ||
            error.code === 'NETWORK_ERROR') {
          setLoadError('Verbindungsfehler. Versuche erneut zu laden...');
          console.log('Connection error, retrying in 3s...');
          setTimeout(() => void loadSavedTrees(), 3000);
          return;
        }

        // Check for authentication errors
        if (error.message?.includes('JWT') || 
            error.code === 'PGRST301' || 
            error.code === '401') {
          console.log('Session expired, refreshing...');
          setLoadError('Sitzung abgelaufen. Aktualisiere...');
          const refreshResponse = await supabase.auth.refreshSession();
          const refreshError = refreshResponse.error;
          
          if (refreshError) {
            console.error('Could not refresh session:', refreshError);
            setUser(null);
            return;
          }
          
          // Wait a bit before retrying to ensure the new session is active
          setTimeout(() => void loadSavedTrees(), 1000);
          return;
        }

        // Log any unhandled errors
        setLoadError('Fehler beim Laden der Themenbäume');
        console.error('Unhandled error:', error);
        return;
      }

      setSavedTrees(trees || []);
      setLoadError(null);
    } catch (error) {
      console.error('Error loading trees:', error);
      
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('fetch') || 
          errorMessage.includes('network') || 
          errorMessage.includes('connection')) {
        setLoadError('Netzwerkfehler. Versuche erneut zu laden...');
        console.log('Network error, retrying in 3s...');
        setTimeout(() => void loadSavedTrees(), 3000);
        return;
      }
      
      setLoadError('Ein unerwarteter Fehler ist aufgetreten');
      console.error('Unhandled error:', error);
    } finally {
      setIsLoadingTrees(false);
    }
  };

  const loadTree = async (id: string) => {
    try {
      setCurrentTreeId(id);
      setCurrentView('preview');
      
      const { data: tree, error } = await supabase
        .from('topic_trees')
        .select('tree_data')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Fehler beim Laden des Themenbaums:', error);
        return;
      }

      if (tree?.tree_data) {
        const treeData = tree.tree_data as TopicTree;
        if (isValidTopicTree(treeData)) {
          setTree(treeData);
        } else {
          console.error('Ungültiges Themenbaum-Format');
        }
      }
    } catch (error) {
      console.error('Unerwarteter Fehler beim Laden des Themenbaums:', error);
    }
  };

  const isValidTopicTree = (data: any): data is TopicTree => {
    return (
      data &&
      Array.isArray(data.collection) &&
      data.metadata &&
      typeof data.metadata.title === 'string'
    );
  };

  const deleteTree = async (id: string) => {
    if (!confirm('Möchten Sie diesen Themenbaum wirklich löschen?')) return;

    const isCurrentTree = id === currentTreeId;
    try {
      const { error } = await supabase
        .from('topic_trees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Fehler beim Löschen des Themenbaums:', error);
        alert('Fehler beim Löschen des Themenbaums');
        return;
      }

      await loadSavedTrees();
    } catch (error) {
      console.error('Unerwarteter Fehler beim Löschen des Themenbaums:', error);
      alert('Fehler beim Löschen des Themenbaums');
    }
  };

  const deleteAllUserData = async () => {
    if (!confirm('Möchten Sie wirklich alle Ihre Themenbäume und Dokumente löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      // Lösche alle Themenbäume des Benutzers
      const { error: treesError } = await supabase
        .from('topic_trees')
        .delete()
        .eq('user_id', user.id);

      if (treesError) {
        throw new Error('Fehler beim Löschen der Themenbäume');
      }

      // Lösche alle Dokumente des Benutzers
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id);

      if (docsError) {
        throw new Error('Fehler beim Löschen der Dokumente');
      }

      // Aktualisiere die UI
      setSavedTrees([]);
      setTree(null);
      alert('Alle Daten wurden erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen aller Daten:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Löschen der Daten');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      // First clear all application state
      setUser(null);
      setSavedTrees([]);
      setTree(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        // Even if there's an error, clear local storage
        window.localStorage.removeItem('supabase-auth');
        // Force reload to ensure clean state
        window.location.reload();
        return;
      }
      
      // Force reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      // Clear local storage and reload as last resort
      window.localStorage.removeItem('supabase-auth');
      window.location.reload();
    }
  };

  const handleTreeUpdate = async (updatedTree: TopicTree) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const { data, error } = await supabase
        .from('topic_trees')
        .upsert({
          tree_data: updatedTree,
          title: updatedTree.metadata.title,
          user_id: user.id
        }, {
          onConflict: 'user_id,title',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data) {
        setCurrentTreeId(data.id);
        setTree(updatedTree);
        void loadSavedTrees();
      }

      return data?.id;

    } catch (error) {
      console.error('Error updating tree:', error);
      alert('Fehler beim Speichern des Themenbaums');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header mit Logout Button */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentView === 'generate' ? 'Themenbaum Generator' : 'Themenbäume'}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2 mr-4">
              <Tab
                icon={<FileText className="w-4 h-4" />}
                label="Generator"
                isActive={currentView === 'generate'}
                onClick={() => setCurrentView('generate')}
              />
              <Tab
                icon={<Eye className="w-4 h-4" />}
                label="Vorschau"
                isActive={currentView === 'preview'}
                onClick={() => setCurrentView('preview')}
              />
            </div>
            <button
              onClick={() => setShowAISettings(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              KI-Einstellungen
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showAISettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">KI-Einstellungen</h2>
              <button
                onClick={() => setShowAISettings(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Schließen</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="sk-..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ihr OpenAI API Key wird sicher im Browser gespeichert
                </p>
              </div>
              
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  KI-Modell
                </label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Wählen Sie das zu verwendende KI-Modell
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAISettings(false)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Speichern & Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {currentView === 'generate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Linke Spalte: Hauptformular */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <TopicForm
                onGenerate={setTree}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                apiKey={apiKey}
                model={model}
              />
            </div>
          </div>
          
          {/* Rechte Spalte: Gespeicherte Bäume und Vorschau */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <div className="flex justify-between items-center">
                  <span>
                    Gespeicherte Themenbäume
                    {isLoadingTrees && (
                      <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />
                    )}
                  </span>
                  <button
                    onClick={deleteAllUserData}
                    disabled={isDeleting || savedTrees.length === 0}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Alles löschen
                  </button>
                </div>
              </h2>
              {loadError && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                  {loadError}
                </div>
              )}
              <div className="overflow-y-auto max-h-[300px]">
                {savedTrees && savedTrees.length > 0 ? (
                  <div className="space-y-2">
                    {savedTrees.map((savedTree) => (
                      <div key={savedTree.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className={`font-medium ${savedTree.id === currentTreeId ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {savedTree.title}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {new Date(savedTree.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => loadTree(savedTree.id)}
                            className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            Laden
                          </button>
                          <button
                            onClick={() => deleteTree(savedTree.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Noch keine Themenbäume gespeichert
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Themenbaum Vorschau
                </h2>
                {tree && !isGenerating ? (
                  <TreeView 
                    tree={tree} 
                    onUpdate={handleTreeUpdate}
                  />
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    <p>Hier erscheint Ihr generierter Themenbaum</p>
                    {isGenerating && (
                      <div className="mt-4">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" />
                        <p className="mt-2">Generiere Themenbaum...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="space-y-8">
            {/* Gespeicherte Themenbäume */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <span>
                      Gespeicherte Themenbäume
                      {isLoadingTrees && (
                        <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />
                      )}
                    </span>
                  </div>
                </h2>
                <button
                  onClick={deleteAllUserData}
                  disabled={isDeleting || savedTrees.length === 0}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDeleting ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Alles löschen
                </button>
              </div>
              {loadError && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                  {loadError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedTrees && savedTrees.length > 0 ? (
                  savedTrees.map((savedTree) => (
                    <div key={savedTree.id} className="flex flex-col justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                      <div className={savedTree.id === currentTreeId ? 'border-l-4 border-indigo-500 pl-2' : ''}>
                        <h4 className="font-medium text-gray-900 mb-1">{savedTree.title}</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          {new Date(savedTree.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => loadTree(savedTree.id)}
                          className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Laden
                        </button>
                        <button
                          onClick={() => deleteTree(savedTree.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Noch keine Themenbäume gespeichert
                  </div>
                )}
              </div>
            </div>

            {/* Vorschau */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Themenbaum Vorschau
                </h2>
                {tree && !isGenerating ? (
                  <TreeView 
                    tree={tree} 
                    onUpdate={handleTreeUpdate}
                  />
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    <p>Hier erscheint Ihr ausgewählter Themenbaum</p>
                    {isGenerating && (
                      <div className="mt-4">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" />
                        <p className="mt-2">Generiere Themenbaum...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
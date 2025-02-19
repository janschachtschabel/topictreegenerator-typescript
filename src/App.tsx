import * as pdfjsLib from 'pdfjs-dist';
import { pipeline, env, type Pipeline, type PipelineType } from '@xenova/transformers';
import { supabase } from './utils/supabase';
import { useState, useEffect, ReactNode } from 'react';
import { Loader2, Trash2, LogOut, Settings, FileText, Eye, Star, MessageSquare } from 'lucide-react';
import { Auth } from './components/Auth';
import TopicForm from './components/TopicForm';
import TreeView from './components/TreeView';
import EvaluationView from './components/EvaluationView';
import DocumentChat from './components/DocumentChat';
import type { TopicTree, Collection } from './types/TopicTree';
import { LLMProvider, LLM_PROVIDERS, getDefaultProvider, getDefaultModel } from './types/LLMProvider';

type View = 'generate' | 'preview' | 'evaluate' | 'chat';

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

export default function App() {
  const [showAISettings, setShowAISettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    // Try to get API key from environment first, then localStorage
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const storedApiKey = localStorage.getItem('apiKey');
    return envApiKey || storedApiKey || '';
  });
  const [model, setModel] = useState('gpt-4o-mini');
  const [provider, setProvider] = useState<LLMProvider>(getDefaultProvider());
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
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

  // Update baseUrl when provider changes
  useEffect(() => {
    setBaseUrl(provider.baseUrl);
    // Set default model for new provider
    setModel(getDefaultModel(provider).id);
  }, [provider]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('apiKey', apiKey);
    }
  }, [apiKey]);

  // Check for existing session
  useEffect(() => {
    const initAuth = async () => {
      setLoadError(null);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          return;
        }
        
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
              setSavedTrees([]);
              setTree(null);
              setLoadError(null);
            }
            
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
        setUser(null);
        setSavedTrees([]);
        setTree(null);
        setLoadError('Fehler bei der Authentifizierung');
      }
    };

    void initAuth();
  }, []);

  // Load saved trees when user logs in
  useEffect(() => {
    if (user) {
      setLoadError(null);
      void loadSavedTrees();
    }
  }, [user]);

  // Add refresh event listener
  useEffect(() => {
    const handleRefresh = () => {
      void loadSavedTrees();
    };

    window.addEventListener('refreshTrees', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshTrees', handleRefresh);
    };
  }, []);

  const loadSavedTrees = async () => {
    if (isLoadingTrees) return;
    setIsLoadingTrees(true);
    setLoadError(null);

    try {
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
      
      console.log('Supabase response:', { response, trees, error });

      if (error) {
        console.error('Fehler beim Laden der Themenbäume:', error);
        
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') || 
            error.message?.includes('network') ||
            error.code === 'NETWORK_ERROR') {
          setLoadError('Verbindungsfehler. Versuche erneut zu laden...');
          console.log('Connection error, retrying in 3s...');
          setTimeout(() => void loadSavedTrees(), 3000);
          return;
        }

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
          
          setTimeout(() => void loadSavedTrees(), 1000);
          return;
        }

        setLoadError('Fehler beim Laden der Themenbäume');
        console.error('Unhandled error:', error);
        return;
      }

      setSavedTrees(trees || []);
      setLoadError(null);
    } catch (error) {
      console.error('Error loading trees:', error);
      
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
      
      // Clear current tree if it was deleted
      if (isCurrentTree) {
        setCurrentTreeId(null);
        setTree(null);
      }
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

      const { error: treesError } = await supabase
        .from('topic_trees')
        .delete()
        .eq('user_id', user.id);

      if (treesError) {
        throw new Error('Fehler beim Löschen der Themenbäume');
      }

      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id);

      if (docsError) {
        throw new Error('Fehler beim Löschen der Dokumente');
      }

      setSavedTrees([]);
      setTree(null);
      setCurrentTreeId(null);
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
      setUser(null);
      setSavedTrees([]);
      setTree(null);
      setCurrentTreeId(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        window.localStorage.removeItem('supabase-auth');
        window.location.reload();
        return;
      }
      
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      window.localStorage.removeItem('supabase-auth');
      window.location.reload();
    }
  };

  const handleTreeUpdate = async (updatedTree: TopicTree) => {
    setIsSaving(true);
    try {
      // Get current user
      const userResponse = await supabase.auth.getUser();
      if (!userResponse.data.user) {
        throw new Error('Nicht angemeldet');
      }
      const user = userResponse.data.user;

      let treeId = currentTreeId;
      let shouldInsert = !treeId;

      if (treeId) {
        // Verify tree exists and belongs to user
        const { data: existingTree, error: fetchError } = await supabase
          .from('topic_trees')
          .select('id')
          .eq('id', treeId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // No rows returned
            shouldInsert = true;
          } else {
            throw fetchError;
          }
        }
      }

      if (shouldInsert) {
        // Create new tree
        const { data: newTree, error: insertError } = await supabase
          .from('topic_trees')
          .insert({
            tree_data: updatedTree,
            title: updatedTree.metadata.title,
            user_id: user.id
          })
          .select('id')
          .single();

        if (insertError) throw new Error('Fehler beim Erstellen des Themenbaums');
        if (!newTree) throw new Error('Fehler beim Speichern des Themenbaums');
        
        treeId = newTree.id;
        setCurrentTreeId(treeId);
      } else {
        // Update existing tree
        const { error: updateError } = await supabase
          .from('topic_trees')
          .update({
            tree_data: updatedTree,
            title: updatedTree.metadata.title
          })
          .eq('id', treeId)
          .eq('user_id', user.id); // Ensure user owns the tree

        if (updateError) throw updateError;
      }

      // Update local state
      setTree(updatedTree);
      
      // Refresh tree list
      void loadSavedTrees();
    } catch (error) {
      console.error('Error updating tree:', error);
      alert('Fehler beim Speichern des Themenbaums. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTreeGenerated = async (newTree: TopicTree) => {
    setTree(newTree);
    setCurrentView('preview');
    void loadSavedTrees();
    
    // Load the newly generated tree to ensure it's properly initialized
    try {
      const { data: trees } = await supabase
        .from('topic_trees')
        .select('id')
        .eq('title', newTree.metadata.title)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (trees && trees.length > 0) {
        const treeId = trees[0].id;
        setCurrentTreeId(treeId);
        await loadTree(treeId);
      }
    } catch (error) {
      console.error('Error loading new tree:', error);
    }
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentView === 'generate' ? 'Themenbaum Generator' : currentView === 'preview' ? 'Themenbäume' : 'Themenbaum Evaluation'}
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
              <Tab
                icon={<Star className="w-4 h-4" />}
                label="Evaluation"
                isActive={currentView === 'evaluate'}
                onClick={() => setCurrentView('evaluate')}
              />
              <Tab
                icon={<MessageSquare className="w-4 h-4" />}
                label="Dokument-Chat"
                isActive={currentView === 'chat'}
                onClick={() => setCurrentView('chat')}
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
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
                  KI-Provider
                </label>
                <select
                  id="provider"
                  value={provider.id}
                  onChange={(e) => {
                    const newProvider = LLM_PROVIDERS.find(p => p.id === e.target.value);
                    if (newProvider) {
                      setProvider(newProvider);
                    }
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {LLM_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder={`${provider.name} API Key`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ihr API Key wird sicher im Browser gespeichert
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
                  {provider.models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Wählen Sie das zu verwendende KI-Modell
                </p>
              </div>

              <div>
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  API Basis-URL
                </label>
                <input
                  type="text"
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://api.example.com/v1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Standard-URL: {provider.baseUrl}
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
      
      {currentView === 'evaluate' && (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <EvaluationView tree={tree} />
          </div>
        </div>
      )}
      
      {currentView === 'chat' && (
        <div className="container mx-auto px-4 py-8">
          <DocumentChat />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {currentView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <TopicForm
                  onGenerate={(newTree) => handleTreeGenerated(newTree, currentTreeId)}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  apiKey={apiKey}
                  model={model}
                  provider={provider}
                  baseUrl={baseUrl}
                />
              </div>
            </div>
            
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
        )}
        {currentView === 'preview' && (
          <div className="space-y-8">
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
                    <div key={savedTree.id} className={`flex flex-col justify-between p-4 bg-gray-50 rounded-lg border ${
                      savedTree.id === currentTreeId 
                        ? 'border-indigo-500 border-l-4' 
                        : 'border-gray-200 hover:border-indigo-300'
                    } transition-colors`}>
                      <div>
                        <h4 className={`font-medium ${savedTree.id === currentTreeId ? 'text-indigo-600' : 'text-gray-900'} mb-1`}>
                          {savedTree.title}
                        </h4>
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
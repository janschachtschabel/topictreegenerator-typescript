import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Upload, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { DocumentUpload } from './DocumentUpload';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DocumentChatProps {
  documentId?: string;
}

export default function DocumentChat({ documentId }: DocumentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Array<{
    id: string;
    title: string;
    content: string;
    metadata?: {
      chunks?: string[];
      relevantChunks?: string[];
    };
  }>>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [chatMode, setChatMode] = useState<'document' | 'general'>('general');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Load documents on mount and when documents are updated
  useEffect(() => {
    void loadDocuments();
  }, [showUpload]); // Reload when upload modal closes

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadDocuments = async () => {
    setIsLoadingDocuments(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, content, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []).map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata
      })));

    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Fehler beim Laden der Dokumente');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || (chatMode === 'document' && !selectedDocument)) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      // Get document content based on chat mode with chunk limiting
      let documentContent = '';
      if (chatMode === 'document') {
        const document = documents.find(doc => doc.id === selectedDocument);
        if (!document) {
          throw new Error('Dokument nicht gefunden');
        }

        // Use relevant chunks if available, otherwise use first 50 chunks
        if (document?.metadata?.relevantChunks?.length) {
          documentContent = document.metadata.relevantChunks.join('\n\n');
        } else if (document?.metadata?.chunks?.length) {
          documentContent = document.metadata.chunks.slice(0, 50).join('\n\n');
        } else {
          // Fallback to first 5000 chars if no chunks available
          documentContent = (document?.content || '').slice(0, 5000);
        }
      }

      // Get API settings from localStorage
      const apiKey = localStorage.getItem('apiKey');
      const model = localStorage.getItem('model') || 'gpt-4o-mini';
      const baseUrl = localStorage.getItem('baseUrl') || 'https://api.openai.com/v1';

      if (!apiKey) {
        throw new Error('Bitte geben Sie einen API Key in den KI-Einstellungen ein');
      }

      // Create chat completion
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: chatMode === 'general'
                ? 'Du bist ein hilfreicher Assistent, der Fragen beantwortet.'
                : `Du bist ein hilfreicher Assistent, der Fragen zu einem Dokument beantwortet. Hier ist der Dokumentinhalt: ${documentContent}`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 
          (response.status === 401 ? 'Ungültiger API Key' :
           response.status === 429 ? 'Zu viele Anfragen. Bitte warten Sie einen Moment.' :
           'Fehler bei der API-Anfrage')
        );
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content;

      if (assistantMessage) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setChatMode('general');
                  setSelectedDocument(undefined);
                  setMessages([{
                    role: 'assistant',
                    content: 'Hallo! Wie kann ich Ihnen helfen?'
                  }]);
                }}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  chatMode === 'general'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Allgemeiner Chat
              </button>
            </div>
            <select
              value={selectedDocument}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setChatMode('general');
                  setSelectedDocument(undefined);
                } else {
                  setChatMode('document');
                  setSelectedDocument(value);
                  setMessages([{
                    role: 'assistant',
                    content: 'Ich kann Ihnen Fragen zu diesem Dokument beantworten.'
                  }]);
                }
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">
                {isLoadingDocuments 
                  ? 'Lade Dokumente...' 
                  : documents.length > 0 
                    ? 'Dokument auswählen' 
                    : 'Keine Dokumente verfügbar'
                }
              </option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md"
            >
              <Upload className="w-4 h-4 mr-2" />
              Dokument hochladen
            </button>
          </div>
        </div>

        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Dokument hochladen</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Schließen</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DocumentUpload
                onDocumentsProcessed={() => {
                  setShowUpload(false);
                  void loadDocuments(); // Reload documents after upload
                }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p className="text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900 prose prose-sm max-w-none'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown 
                  className="text-sm [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mb-4 [&>ol]:mb-4 [&>blockquote]:mb-4"
                  components={{
                    p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              chatMode === 'general'
                ? "Stellen Sie eine Frage..."
                : selectedDocument
                ? "Stellen Sie eine Frage zum Dokument..."
                : documents.length > 0 
                  ? "Bitte wählen Sie ein Dokument aus oder nutzen Sie den allgemeinen Chat" 
                  : "Laden Sie zuerst ein Dokument hoch oder nutzen Sie den allgemeinen Chat"
            }
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[42px]"
            disabled={isLoading || (chatMode === 'document' && !selectedDocument)}
          />
          <button
            type="submit"
            disabled={!input.trim() || (chatMode === 'document' && !selectedDocument) || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
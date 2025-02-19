import { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, X, Trash2 } from 'lucide-react';
import { processDocument } from '../utils/documentProcessor';
import { supabase } from '../utils/supabase';

interface DocumentUploadProps {
  onDocumentsProcessed: (contexts: string[]) => void;
  onDocumentIdsUpdate?: (ids: string[]) => void;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  context?: string;
  error?: string;
}

export function DocumentUpload({ onDocumentsProcessed, onDocumentIdsUpdate }: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load documents on mount
  useEffect(() => {
    setIsProcessing(false);
    setProcessingStatus('');
    setOverallProgress(0);
    void loadUserDocuments();
  }, []); 

  const loadUserDocuments = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (documents) {
      const contexts = documents.map(doc => doc.content);
      const ids = documents.map(doc => doc.id);
      onDocumentsProcessed(contexts);
      setDocumentIds(ids);
      if (onDocumentIdsUpdate) {
        onDocumentIdsUpdate(ids);
      }
    }
    setIsLoading(false);
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen?')) return;

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Löschen des Dokuments:', error);
      alert('Fehler beim Löschen des Dokuments');
      return;
    }

    await loadUserDocuments();
  };

  const deleteAllDocuments = async () => {
    if (!confirm('Möchten Sie wirklich alle Dokumente löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Fehler beim Löschen aller Dokumente:', error);
      alert('Fehler beim Löschen der Dokumente');
      return;
    }

    setUploadedFiles([]);
    setDocumentIds([]);
    onDocumentsProcessed([]);
    if (onDocumentIdsUpdate) {
      onDocumentIdsUpdate([]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf'
    ];

    const newFiles = Array.from(files)
      .filter(file => allowedTypes.includes(file.type))
      .map(file => ({ file, status: 'pending' as const }));

    if (newFiles.length === 0) {
      alert('Bitte laden Sie nur PDF, DOCX, RTF oder TXT Dateien hoch.');
      return;
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    const totalFiles = newFiles.length;
    let processedFiles = 0;

    try {
      setIsUploading(true);
      const contexts: string[] = [];
      
      for (const fileObj of newFiles) {
        const index = uploadedFiles.length + newFiles.indexOf(fileObj);
        setProcessingStatus(`Verarbeite ${fileObj.file.name}...`);
        setUploadedFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'processing' } : f
        ));

        try {
          const context = await processDocument(fileObj.file);
          contexts.push(context);
          
          processedFiles++;
          setOverallProgress((processedFiles / totalFiles) * 100);
          
          // Store document in Supabase
          const { data: savedDoc, error: saveError } = await supabase
            .from('documents')
            .insert({
              title: fileObj.file.name,
              content: context,
              file_type: fileObj.file.type,
              user_id: user.id,
              metadata: {
                original_size: fileObj.file.size,
                processing_date: new Date().toISOString(),
                chunks: context.split('\n\n'),
                relevantChunks: context.split('\n\n').slice(0, 50)
              }
            })
            .select('id')
            .single();

          if (saveError) {
            throw new Error('Fehler beim Speichern des Dokuments');
          }

          // Store the context with the file
          setUploadedFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'done', context } : f
          ));
        } catch (error) {
          setUploadedFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Unbekannter Fehler' } : f
          ));
        }
      }

      onDocumentsProcessed(contexts);
      setProcessingStatus('Alle Dokumente verarbeitet');
      await loadUserDocuments(); // Reload documents after processing
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
      setOverallProgress(0);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          Hochgeladene Dokumente
          {isLoading && <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />}
        </h3>
        {documentIds.length > 0 && (
          <button
            onClick={deleteAllDocuments}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Alle löschen
          </button>
        )}
      </div>
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.rtf,.txt"
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-flex flex-col items-center space-y-2"
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <span className="text-sm text-gray-600">
            Dateien hierher ziehen oder klicken zum Auswählen
          </span>
          <span className="text-xs text-gray-500">
            Unterstützte Formate: PDF, DOCX, RTF, TXT
          </span>
        </label>
      </div>
      
      {isProcessing && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{processingStatus}</span>
            <span className="text-sm text-gray-600">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">{file.file.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {file.status === 'processing' && (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                )}
                {file.status === 'done' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-600">Verarbeitet</span>
                    <button
                      onClick={() => {
                        if (file.context) {
                          const preview = file.context.slice(0, 100) + (file.context.length > 100 ? '...' : '');
                          alert(`Extrahierter Kontext:\n\n${preview}`);
                        }
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Vorschau
                    </button>
                  </div>
                )}
                {file.status === 'error' && (
                  <span className="text-xs text-red-600">{file.error}</span>
                )}
                {!isProcessing && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Datei entfernen"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )).reverse()}
        </div>
      )}
    </div>
  );
}
interface MetadataFormProps {
  title: string;
  author: string;
  targetAudience: string;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onTargetAudienceChange: (value: string) => void;
  titleError?: string | null;
  isCheckingTitle?: boolean;
}

export function MetadataForm({
  title,
  author,
  targetAudience,
  onTitleChange,
  onAuthorChange,
  onTargetAudienceChange,
  titleError,
  isCheckingTitle
}: MetadataFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Titel des Themenbaums
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={`w-full rounded-md shadow-sm focus:ring-indigo-500 ${
            titleError 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-indigo-500'
          }`}
          placeholder="z.B. Physik Sekundarstufe II"
          required
        />
        {isCheckingTitle && (
          <p className="text-sm text-gray-500">
            Überprüfe Titel...
          </p>
        )}
        {titleError && (
          <p className="text-sm text-red-600">
            {titleError}
          </p>
        )}
      </div>
      
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">
          Autor
        </label>
        <input
          type="text"
          id="author"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Name des Autors"
        />
      </div>
      
      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
          Zielgruppe
        </label>
        <input
          type="text"
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => onTargetAudienceChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="z.B. Lehrkräfte und Bildungseinrichtungen"
        />
      </div>
    </div>
  );
}
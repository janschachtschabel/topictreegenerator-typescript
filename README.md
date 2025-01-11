# Themenbaum Generator

A powerful web application for generating and managing hierarchical topic trees, specifically designed for educational content structuring. Built with React, TypeScript, and Supabase.

## Features

- **AI-Powered Topic Generation**: Generate structured topic trees using OpenAI's GPT models
- **Document Processing**: Upload and process PDF, DOCX, RTF, and TXT files
- **Interactive Tree Editor**: Edit, add, and delete nodes in the topic tree
- **Multiple Knowledge Sources**:
  - AI Knowledge Only
  - AI + Documents
  - Documents Only
- **Export Options**: Download trees as JSON or ASCII text
- **User Authentication**: Secure user accounts with email/password
- **Database Storage**: Persistent storage of topic trees and documents
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- OpenAI API key
- Supabase account

## Environment Variables

Create a `.env` file in the root directory with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd themenbaum-generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/         # React components
├── constants/         # Constants and mappings
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── App.tsx           # Main application component
```

## Key Components

- **Auth**: User authentication component
- **TopicForm**: Main form for generating topic trees
- **TreeView**: Interactive tree visualization and editing
- **DocumentUpload**: Document processing and management

## Features in Detail

### Topic Generation
- Configurable number of main topics, subtopics, and curriculum topics
- Support for different educational contexts and disciplines
- Optional sections for general information and methodology

### Document Processing
- PDF text extraction with PDF.js
- DOCX processing with Mammoth.js
- RTF and TXT support
- Semantic chunking and embedding generation

### Tree Editing
- Add/edit/delete nodes at any level
- Edit all node properties (title, short title, description, keywords)
- Real-time updates
- Unsaved changes detection

## Database Schema

### Topic Trees
- Stores hierarchical topic structures
- Links to associated documents
- User-specific storage

### Documents
- Stores processed document content
- Supports full-text search
- Maintains file metadata

## Security

- Row Level Security (RLS) enabled
- User-specific data isolation
- Secure authentication flow
- Protected API endpoints

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- OpenAI API
- PDF.js
- Transformers.js

## Production Deployment

The application is deployed on Netlify and can be accessed at:
https://visionary-mandazi-1f971b.netlify.app

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
# Themenbaum Generator

Ein leistungsstarkes Webtool zur Generierung und Verwaltung von hierarchischen Themenbäumen, speziell entwickelt für die Strukturierung von Bildungsinhalten. Entwickelt mit React, TypeScript und Supabase.

## 🌟 Hauptfunktionen

### 🤖 KI-gestützte Themengenerierung
- **Mehrere KI-Modelle**: Unterstützung für GPT-4o-mini, GPT-4o
- **Flexible Konfiguration**: Einstellbare Anzahl von Haupt-, Unter- und Lehrplanthemen
- **Intelligente Hierarchie**: Automatische Generierung sinnvoller Themenstrukturen
- **Kontextbewusste Vorschläge**: Berücksichtigung des Bildungskontexts
- **Sektorspezifische Anpassung**: Automatische Anpassung der Terminologie

### 📄 Dokumentenverarbeitung
- **Unterstützte Formate**:
  - PDF (mit Textextraktion)
  - DOCX (mit Formatierungserhalt)
  - RTF
  - TXT
- **Intelligente Verarbeitung**:
  - Semantische Textzerlegung
  - Embedding-basierte Relevanzanalyse
  - Automatische Dokumentenkategorisierung
  - Sektorspezifische Inhaltsanalyse

### 🔄 Wissensquellen
1. **Reines KI-Wissen**: Generierung basierend auf KI-Modellen
2. **KI + Dokumente**: Kombination von KI und hochgeladenen Dokumenten
3. **Nur Dokumente**: Themenbäume aus Dokumenteninhalten
4. **Dokumente mit Sortierung**: Intelligente Dokumentenanalyse mit Sektorkategorisierung
5. **Manuelle Erstellung**: Eigene Themenbäume erstellen

### 🎨 Interaktiver Baumeditor
- **Visuelle Bearbeitung**: Intuitive Baumstruktur-Bearbeitung
- **Echtzeit-Updates**: Sofortige Aktualisierung der Änderungen
- **Drag & Drop**: Organisation per Drag & Drop
- **Knotenbearbeitung**:
  - Titel und Kurztitel
  - Beschreibungen
  - Schlagworte
  - Sektorspezifische Alternativtitel

### 🎓 Bildungssektoren
- **Grundbildend**: Grundlegende Bildungsinhalte
- **Allgemeinbildend**: Allgemeine Bildung
- **Berufsbildend**: Berufliche Bildung
- **Akademisch**: Hochschulbildung

### 👁️ Ansichtsmodi
- **Baumansicht**: Klassische hierarchische Darstellung
- **ASCII-Ansicht**: Textbasierte Baumvisualisierung
- **Sektorvergleich**: Parallele Ansicht verschiedener Sektoren
- **Verbindungsansicht**: Interaktive Visualisierung der Beziehungen

### 📊 Evaluierung
- Automatische Qualitätsbewertung
- Detaillierte Verbesserungsvorschläge
- Sektorspezifische Analyse

## 🚀 Erste Schritte

### Voraussetzungen
- Node.js 18 oder höher
- npm 9 oder höher
- OpenAI API-Schlüssel
- Supabase-Konto

### Installation

1. Repository klonen:
\`\`\`bash
git clone [repository-url]
cd themenbaum-generator
\`\`\`

2. Abhängigkeiten installieren:
\`\`\`bash
npm install
\`\`\`

3. Umgebungsvariablen konfigurieren:
   - Erstellen Sie eine \`.env\` Datei im Hauptverzeichnis
   - Fügen Sie folgende Variablen hinzu:
   \`\`\`env
   VITE_SUPABASE_URL=ihre_supabase_url
   VITE_SUPABASE_ANON_KEY=ihr_supabase_anon_key
   VITE_OPENAI_API_KEY=ihr_openai_api_key
   \`\`\`

4. Entwicklungsserver starten:
\`\`\`bash
npm run dev
\`\`\`

## 💡 Nutzungsanleitung

### 1. Anmeldung
- Registrieren Sie sich mit E-Mail und Passwort
- Oder melden Sie sich mit bestehenden Zugangsdaten an

### 2. KI-Einstellungen
- Klicken Sie auf "KI-Einstellungen"
- Wählen Sie den gewünschten KI-Provider
- Geben Sie Ihren API-Schlüssel ein
- Wählen Sie das zu verwendende Modell

### 3. Themenbaum erstellen

#### Option A: KI-Generierung
1. Wählen Sie "Mit KI-Wissen" als Wissensquelle
2. Geben Sie Titel und Thema ein
3. Konfigurieren Sie:
   - Anzahl der Hauptkategorien
   - Anzahl der Unterkategorien
   - Anzahl der Lehrplanthemen
4. Wählen Sie optional:
   - Fachbereich
   - Bildungsstufe
   - Sonderregeln für Hauptkategorien
5. Klicken Sie auf "Themenbaum generieren"

#### Option B: Dokumentenbasiert
1. Wählen Sie "Mit Dokumentenwissen" als Quelle
2. Laden Sie relevante Dokumente hoch
3. Konfigurieren Sie die Generierungseinstellungen
4. Starten Sie die Generierung

#### Option C: Manuelle Erstellung
1. Wählen Sie "Manuelle Erstellung"
2. Klicken Sie auf "Themenbaum erstellen"
3. Fügen Sie Hauptthemen hinzu
4. Erweitern Sie die Struktur nach Bedarf

### 4. Themenbaum bearbeiten
- Nutzen Sie den visuellen Editor
- Bearbeiten Sie Knoten durch Anklicken
- Ziehen Sie Knoten per Drag & Drop
- Speichern Sie Änderungen

### 5. Ansichten und Export
- Wechseln Sie zwischen Ansichtsmodi
- Exportieren Sie als:
  - JSON (vollständige Daten)
  - ASCII (Textdarstellung)
  - Kategorielisten (bei Dokumentenanalyse)

### 6. Evaluation
- Wählen Sie den "Evaluation" Tab
- Starten Sie die automatische Bewertung
- Prüfen Sie die Verbesserungsvorschläge

## 🔧 Technische Details

### Dokumentenverarbeitung
- PDF-Textextraktion mit pdf.js
- DOCX-Verarbeitung mit Mammoth.js
- Automatische Textsegmentierung
- Embedding-Generierung mit Transformers.js
- Semantische Ähnlichkeitsanalyse
- Automatische Sektorklassifizierung

### Datenbank-Integration
- Supabase Backend
- Echtzeit-Updates
- Row Level Security
- Volltextsuche
- Dokumenten-Metadaten
- Benutzerdatenisolierung

### UI/UX
- Responsives Design
- Ladezustände und Fortschrittsanzeigen
- Fehlerbehandlung
- Intuitive Navigation
- Moderne Benutzeroberfläche
- Tailwind CSS Styling

## 🤝 Mitwirken

1. Fork des Repositories erstellen
2. Feature-Branch erstellen
3. Änderungen committen
4. Branch pushen
5. Pull Request erstellen

## 📝 Lizenz

MIT Lizenz

## 💬 Support

Bei Fragen oder Problemen:
1. Öffnen Sie ein Issue im Repository
2. Kontaktieren Sie das Entwicklungsteam
3. Prüfen Sie die [Dokumentation](https://visionary-mandazi-1f971b.netlify.app)
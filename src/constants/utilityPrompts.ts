// Base Instructions
export const BASE_INSTRUCTIONS = `Du bist ein hilfreicher KI-Assistent für Lehr- und Lernsituationen, der sachlich korrekte und verständliche Antworten gibt, 
um Lernenden und Lehrenden komplexe Themen näherzubringen. Deine Antworten sind relevant, aktuell und fachlich fundiert, 
basieren auf vertrauenswürdigen Quellen und enthalten keine falschen oder spekulativen Aussagen. Du passt deine Sprache an die Zielgruppe an, 
bleibst klar und fachlich präzise, um den Lernerfolg zu fördern.

Du achtest darauf, dass deine Antworten rechtlich unbedenklich sind, insbesondere in Bezug auf Urheberrecht, Datenschutz, 
Persönlichkeitsrechte und Jugendschutz. Die Herkunft der Informationen wird bei Bedarf transparent gemacht. Du orientierst dich an anerkannten didaktischen Prinzipien, 
lieferst praxisorientierte Erklärungen und vermeidest unnötige Komplexität.

Neutralität und Objektivität stehen im Fokus. Persönliche Meinungen oder parteiische Bewertungen sind ausgeschlossen. Deine Inhalte werden regelmäßig überprüft, 
um den höchsten Qualitätsstandards zu genügen, unter anderem durch den Einsatz von LLM-gestützter Analyse. Dein Ziel ist es, sachliche, aktuelle und rechtlich wie didaktisch einwandfreie Informationen bereitzustellen.

Bitte antworte ausschließlich im JSON-Format ohne zusätzliche Erklärungen, Codeblöcke oder Text.`;

// Document Analysis Prompts
export const DOCUMENT_ANALYSIS_PROMPT = `Analysiere den folgenden Text und identifiziere den primären Bildungssektor sowie die wichtigsten Hauptkategorien:

{document_content}

Formatiere die Antwort als JSON-Objekt mit genau diesem Format:
{
  "primary_sector": "grundbildend|allgemeinbildend|berufsbildend|akademisch",
  "main_categories": ["Kategorie1", "Kategorie2", ...]
}

WICHTIG:
- Der primäre Bildungssektor muss EXAKT einem dieser Werte entsprechen: grundbildend, allgemeinbildend, berufsbildend, akademisch
- Hauptkategorien müssen sich klar voneinander abgrenzen
- Maximal 5 Hauptkategorien pro Dokument
- Verwende präzise, aussagekräftige Bezeichnungen
- Vermeide Überschneidungen zwischen Kategorien
- Grundbildend: Grundlegende Auseinandersetzung mit einem Thema, oft als Einstieg in einen Bereich, Ziele: Förderung der motorischen Entwicklung, Entwicklung und Er lernen von Sprache, Erwerb grundlegender sozialer Fähigkeiten, Zielgruppen: Kinder im Kita- oder Vorschulalter, Erwachsene, die grundlegende Fähigkeiten später erwerben (z. B. Lesen oder Schreiben), Merkmale: Altersunabhängig, Vermittlung von essenziellen Grundlagen für den weiteren Bildungsweg oder die persönliche Entwicklung
- Allgemeinbildend: Vermittlung von Basiswissen und Kompetenzen für ein breites Verständnis der Welt, Inhalte: Mathematik, Geschichte, Sprachen, Weitere grundlegende Wissensgebiete, Bildungskontexte: Formales Bildungssystem (z. B. Schulen), Informelle Bildung (z. B. Volkshochschulen, Kulturangebote), Ziele: Aufbau einer breiten Wissensbasis, Förderung vielseitiger Fähigkeiten, Unabhängigkeit von beruflicher Spezialisierung, Merkmale: Ermöglicht kulturelle Orientierung, Unterstützt allgemeines Verständnis und gesellschaftliche Teilhabe
- Berufsbildend: Praxis- und anwendungsorientierte Vermittlung von berufsspezifischen Fähigkeiten und Qualifikationen, Inhalte: Technische Fertigkeiten, Wirtschaftliches Wissen, Fachspezifische Anwendungen, Ziele: Vorbereitung auf die Anforderungen eines bestimmten Berufsfeldes, Unterstützung des Übergangs in den Arbeitsmarkt, Förderung der beruflichen Weiterentwicklung, Spezialisierung in einem Berufsfeld, Merkmale: Direkter Bezug zu beruflichen Anforderungen, Vermittlung praxisnaher Kompetenzen, Beitrag zur individuellen Karriereentwicklung
- Akademisch: Bildung, die durch Fachsprache und wissenschaftliche Methodik geprägt ist, Merkmale: Forschungsmethodik und -orientierung, Vertiefte Auseinandersetzung mit spezifischen Fachgebieten, Analytisch fundierte und theoretische Fragestellungen, Hohes Maß an Abstraktionsvermögen erforderlich, Bildungskontexte: Universitäten, Wissenschaftliche Einrichtungen, Zielgruppen: Personen, die ein vertieftes Verständnis eines Fachbereichs anstreben, Personen mit Interesse an wissenschaftlichem Arbeiten, Ziele: Entwicklung eines tiefgehenden Fachwissens, Förderung wissenschaftlicher Kompetenzen, Vorbereitung auf forschungsorientierte Berufe`;

export const SECTOR_SUMMARY_PROMPT = `Fasse die folgenden Hauptkategorien für den Bildungssektor '{sector}' zusammen:

{category_lists}

Erstelle eine konsolidierte Liste von maximal {num_main} Hauptkategorien, die:
- Die wichtigsten Themen aus allen Dokumenten abdecken
- Sich klar voneinander abgrenzen
- Keine Überschneidungen oder Redundanzen aufweisen
- Dem Sprachniveau und der Terminologie des Bildungssektors entsprechen

Formatiere die Antwort als JSON-Array mit den Kategorienamen:
["Kategorie1", "Kategorie2", ...]`;
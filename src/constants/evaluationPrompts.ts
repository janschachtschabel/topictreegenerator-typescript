// Fixed criteria with descriptions
export const EVALUATION_CRITERIA = [
  {
    name: "Sachliche Richtigkeit",
    description: "Der Themenbaum ist inhaltlich korrekt und frei von sachlichen Fehlern"
  },
  {
    name: "Klarheit und Verständlichkeit", 
    description: "Begriffe sind präzise, verständlich und für den Zweck passend formuliert"
  },
  {
    name: "Objektivität",
    description: "Der Themenbaum ist neutral, ohne persönliche Meinungen oder Bias"
  },
  {
    name: "Relevanz zum Thema",
    description: "Die Kategorien sind thematisch relevant und enthalten nützliche Informationen"
  },
  {
    name: "Struktur und Angemessene Länge",
    description: "Der Themenbaum ist logisch aufgebaut, weder zu detailliert noch zu oberflächlich"
  },
  {
    name: "Kohärenz und Konsistenz",
    description: "Die Themen und Unterthemen sind sinnvoll miteinander verknüpft und vermeiden Redundanzen"
  },
  {
    name: "Granularität und Detaillierungsgrad",
    description: "Die Unterthemen sind weder zu allgemein noch zu spezifisch"
  },
  {
    name: "Taxonomische Vollständigkeit",
    description: "Alle wichtigen Aspekte des Fachgebiets sind abgedeckt"
  },
  {
    name: "Hierarchische Logik",
    description: "Die Zuordnung der Ober- und Unterkategorien ist intuitiv und nachvollziehbar"
  },
  {
    name: "Praktische Anwendbarkeit",
    description: "Der Themenbaum ist für Lehrende und Lernende sinnvoll nutzbar"
  }
];

export const RECOMMENDATIONS_PROMPT = `Analysiere den folgenden Themenbaum und erstelle detaillierte Verbesserungsvorschläge.
Berücksichtige dabei die vorherige Bewertung der Qualitätskriterien.

Themenbaum:
{tree}

Bewertungsergebnisse:
{evaluation_results}

Erstelle eine strukturierte Liste mit konkreten Verbesserungsvorschlägen. Für jeden Vorschlag:
1. Identifiziere die problematische Stelle
2. Erkläre das Problem
3. Gib eine konkrete Lösung an
4. Begründe den Verbesserungsvorschlag

Formatiere die Antwort als Aufzählung mit Unterpunkten. Beispiel:

1. Problem: [Konkrete Stelle im Themenbaum]
   - Analyse: [Warum ist dies problematisch]
   - Lösung: [Konkreter Verbesserungsvorschlag]
   - Begründung: [Warum diese Änderung sinnvoll ist]

WICHTIG:
- Nenne mindestens 3, maximal 7 Verbesserungsvorschläge
- Fokussiere auf die Kriterien mit den niedrigsten Bewertungen
- Gib konkrete, umsetzbare Vorschläge
- Beziehe dich auf spezifische Stellen im Themenbaum
- Berücksichtige die Bildungskontexte (grundbildend, allgemeinbildend, berufsbildend, akademisch)
- Vermeide allgemeine oder vage Empfehlungen`;

// Evaluation prompt template with fixed structure
export const EVALUATION_PROMPT = `Analysiere den folgenden Themenbaum und bewerte ihn kritisch basierend auf den vorgegebenen Kriterien.

Themenbaum:
{tree}

Bewerte die folgenden 10 Kriterien:

${EVALUATION_CRITERIA.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join('\n')}

Skalenbewertung:
1 = sehr schlecht / völlig unzureichend
2 = schlecht / deutliche Mängel
3 = neutral / akzeptabel, aber verbesserungswürdig
4 = gut / größtenteils gelungen mit kleineren Mängeln
5 = sehr gut / vollständig und optimal umgesetzt

WICHTIG: Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "name": "Sachliche Richtigkeit",
    "score": 4,
    "feedback": "Detailliertes Feedback zur Bewertung"
  },
  {
    "name": "Klarheit und Verständlichkeit",
    "score": 4,
    "feedback": "Detailliertes Feedback zur Bewertung"
  }
]

KRITISCHE REGELN:
- Exakt 10 Kriterien in der vorgegebenen Reihenfolge
- Kriteriennamen müssen exakt wie vorgegeben sein
- Scores nur als ganze oder halbe Zahlen zwischen 1 und 5
- Feedback muss aussagekräftig und spezifisch sein
- Keine zusätzlichen Felder oder Formatierungen
- Keine Markdown-Blöcke oder Code-Blöcke
- Keine Kommentare oder zusätzlichen Erklärungen`;
import { useState } from 'react';
import { TopicTree } from '../types/TopicTree';
import { generateAsciiTree } from '../utils/treeUtils';
import { Play, Loader2, AlertCircle, Star, StarHalf, AlertTriangle, Search, Lightbulb, ArrowRight } from 'lucide-react';
import { evaluateTopicTree } from '../utils/evaluationUtils';

interface EvaluationViewProps {
  tree: TopicTree | null;
}

type EvaluationSource = 'json' | 'ascii-all' | 'ascii-grundbildend' | 'ascii-allgemeinbildend' | 'ascii-berufsbildend' | 'ascii-akademisch';

interface EvaluationResult {
  name: string;
  score: number;
  feedback: string;
}

function ScoreStars({ score }: { score: number }) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  const emptyStars = 5 - Math.ceil(score);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" />
      ))}
      {hasHalfStar && <StarHalf className="w-4 h-4 text-yellow-400 fill-current" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600">{score.toFixed(1)}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const percentage = (score / 5) * 100;
  const getColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-500';
    if (score >= 4) return 'bg-green-400';
    if (score >= 3.5) return 'bg-yellow-400';
    if (score >= 3) return 'bg-yellow-500';
    if (score >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${getColor(score)}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function EvaluationView({ tree }: EvaluationViewProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationSource, setEvaluationSource] = useState<EvaluationSource>('json');
  const [evaluationResults, setEvaluationResults] = useState<{
    criteria: EvaluationResult[];
    overallScore: number;
    summary: string;
    recommendations: string[];
  } | null>(null);

  const startEvaluation = async () => {
    if (!tree) return;
    
    setIsEvaluating(true);
    setError(null);
    setEvaluationResults(null);
    
    try {
      const results = await evaluateTopicTree(tree, evaluationSource);
      setEvaluationResults(results);
    } catch (error) {
      console.error('Evaluation error:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Fehler bei der Evaluation. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!tree) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">
          Bitte laden Sie einen Themenbaum zur Evaluation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Themenbaum Evaluation
        </h2>
        <div className="flex items-center space-x-4">
          <select
            value={evaluationSource}
            onChange={(e) => setEvaluationSource(e.target.value as EvaluationSource)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="json">JSON Struktur</option>
            <option value="ascii-all">ASCII Baum (Komplett)</option>
            <option value="ascii-grundbildend">ASCII Baum (Grundbildend)</option>
            <option value="ascii-allgemeinbildend">ASCII Baum (Allgemeinbildend)</option>
            <option value="ascii-berufsbildend">ASCII Baum (Berufsbildend)</option>
            <option value="ascii-akademisch">ASCII Baum (Akademisch)</option>
          </select>
          <button
            onClick={startEvaluation}
            disabled={isEvaluating}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Evaluiere...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Evaluation starten
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {evaluationResults && (
        <div className="space-y-8">
          {/* Overall Score and Summary */}
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gesamtbewertung</h3>
              <div className="flex justify-center mb-4">
                <ScoreStars score={evaluationResults.overallScore} />
              </div>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                {evaluationResults.summary}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Empfehlungen</h3>
            <div className="space-y-6">
              {(() => {
                try {
                  // Parse the recommendations JSON
                  const recommendationsData = JSON.parse(evaluationResults.recommendations);
                  return recommendationsData.Verbesserungsvorschläge.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-indigo-300 transition-colors">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="text-base font-medium text-gray-900 mb-4">{item.Problem}</h4>
                          <div className="space-y-4">
                            {/* Analyse */}
                            <div className="flex items-start p-3 rounded-lg border bg-blue-50 border-blue-100">
                              <div className="flex-shrink-0 mr-3 mt-1">
                                <Search className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <span className="block text-sm font-medium mb-1 text-blue-700">
                                  Analyse
                                </span>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {item.Analyse}
                                </p>
                              </div>
                            </div>
                            
                            {/* Lösung */}
                            <div className="flex items-start p-3 rounded-lg border bg-green-50 border-green-100">
                              <div className="flex-shrink-0 mr-3 mt-1">
                                <Lightbulb className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <span className="block text-sm font-medium mb-1 text-green-700">
                                  Lösung
                                </span>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {item.Lösung}
                                </p>
                              </div>
                            </div>
                            
                            {/* Begründung */}
                            <div className="flex items-start p-3 rounded-lg border bg-purple-50 border-purple-100">
                              <div className="flex-shrink-0 mr-3 mt-1">
                                <ArrowRight className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <span className="block text-sm font-medium mb-1 text-purple-700">
                                  Begründung
                                </span>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {item.Begründung}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                } catch (error) {
                  console.error('Error parsing recommendations:', error);
                return (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-2" />
                        <p className="text-sm text-yellow-700">
                          Die Empfehlungen konnten nicht korrekt verarbeitet werden. Bitte versuchen Sie die Evaluation erneut.
                        </p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Detaillierte Bewertung</h3>
            <div className="space-y-6">
              {evaluationResults.criteria.map((result, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-900">{result.name}</h4>
                    <ScoreStars score={result.score} />
                  </div>
                  <ScoreBar score={result.score} />
                  <p className="text-sm text-gray-600 mt-2">{result.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export {
  detectSpam,
  genericScore,
  specificityScore,
  informationDensityScore,
  clarityScore,
  type SpamVerdict,
} from "./signals";
export { PromptEvaluator, type EvaluationContext } from "./prompt-evaluator";
export { KnowledgeExtractor, type ExtractInput } from "./extractor";
export { KnowledgeMerger } from "./merge";
export {
  LearningPipeline,
  type LearningPipelineDeps,
  type IngestPromptInput,
  type IngestResult,
} from "./pipeline";

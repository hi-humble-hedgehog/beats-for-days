import ts from "typescript";

/** A function found in a source file, with its cyclomatic complexity. */
export interface FunctionComplexity {
  name: string;
  /** 1-based line of the function's first token. */
  line: number;
  /** Character offsets of the function node within the source text. */
  start: number;
  end: number;
  complexity: number;
}

const BRANCHING_NODES: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.CaseClause,
]);

const SHORT_CIRCUIT_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

type FunctionWithBody = ts.FunctionLikeDeclaration & { body: ts.Node };

function isFunctionWithBody(node: ts.Node): node is FunctionWithBody {
  return ts.isFunctionLike(node) && "body" in node && node.body !== undefined;
}

/** Number of extra execution paths a single node introduces (0 or 1). */
function branchWeight(node: ts.Node): number {
  if (BRANCHING_NODES.has(node.kind)) return 1;
  if (
    ts.isBinaryExpression(node) &&
    SHORT_CIRCUIT_OPERATORS.has(node.operatorToken.kind)
  ) {
    return 1;
  }
  return 0;
}

/**
 * McCabe cyclomatic complexity: 1 + number of decision points.
 * Nested functions are excluded — they are scored on their own.
 */
function cyclomaticComplexity(fn: FunctionWithBody): number {
  let complexity = 1;
  const visit = (node: ts.Node): void => {
    if (isFunctionWithBody(node)) return;
    complexity += branchWeight(node);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(fn, visit);
  return complexity;
}

function functionName(fn: FunctionWithBody, sourceFile: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(fn)) return "constructor";
  const name = ts.getNameOfDeclaration(fn);
  return name ? name.getText(sourceFile) : "<anonymous>";
}

/** Parses `sourceText` and returns every function that has a body. */
export function extractFunctions(
  fileName: string,
  sourceText: string,
): FunctionComplexity[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const functions: FunctionComplexity[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionWithBody(node)) {
      const start = node.getStart(sourceFile);
      functions.push({
        name: functionName(node, sourceFile),
        line: sourceFile.getLineAndCharacterOfPosition(start).line + 1,
        start,
        end: node.getEnd(),
        complexity: cyclomaticComplexity(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return functions;
}

/**
 * Normalize keyword: uppercase và chỉ giữ lại A-Z
 */
export function normalizeKeyword(keyword: string): string {
  return keyword.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Đếm số chữ cái trong keyword (theo quy tắc chuẩn)
 */
export function countKeywordLetters(keyword: string): number {
  return normalizeKeyword(keyword).length;
}

/**
 * Đếm số chữ cái trong answer text (loại bỏ khoảng trắng)
 */
export function countAnswerWords(answerText: string): number {
  return answerText.replace(/\s+/g, "").length;
}

/**
 * Normalize answer để so sánh: uppercase, trim, collapse spaces
 */
export function normalizeAnswer(answer: string): string {
  return answer
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * So sánh answer với đáp án (case-insensitive, normalize spaces)
 */
export function compareAnswers(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

/**
 * So sánh keyword guess với keyword answer
 */
export function compareKeyword(userKeyword: string, correctKeyword: string): boolean {
  return normalizeKeyword(userKeyword) === normalizeKeyword(correctKeyword);
}


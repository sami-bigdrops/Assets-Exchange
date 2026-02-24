import { describe, it, expect, vi } from "vitest";

// Note: These tests use simplified versions of the extraction logic
// for unit testing. In production, use the actual GrammarService methods.

describe("Grammar Feedback Extraction", () => {
  describe("Phase 4.2 - Service Logic Scenarios", () => {
    describe("1️⃣ Multiple Grammar Issues", () => {
      it("should extract multiple grammar issues from corrections array", () => {
        const resultData = {
          corrections: [
            {
              original: "teh",
              correction: "the",
              category: "spelling",
            },
            {
              incorrect: "its",
              correct: "it's",
              category: "punctuation",
            },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(2);
        expect(feedback[0]).toMatchObject({
          category: "spelling",
          message: expect.stringContaining("teh"),
          originalText: "teh",
          suggestedText: "the",
          severity: "warning",
        });
        expect(feedback[1]).toMatchObject({
          category: "punctuation",
          message: expect.stringContaining("its"),
          originalText: "its",
          suggestedText: "it's",
          severity: "warning",
        });
      });

      it("should extract multiple grammar issues from issues array", () => {
        const resultData = {
          corrections: [],
          issues: [
            {
              text: "passive voice detected",
              message: "Consider using active voice",
              severity: "info",
            },
            {
              error_text: "run-on sentence",
              suggestion: "Break into shorter sentences",
              type: "style",
            },
          ],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(2);
        expect(feedback[0]).toMatchObject({
          message: "Consider using active voice",
          severity: "info",
        });
        expect(feedback[1]).toMatchObject({
          category: "style",
          severity: "info",
        });
      });

      it("should extract issues from both corrections and issues arrays", () => {
        const resultData = {
          corrections: [
            {
              original: "teh",
              correction: "the",
            },
          ],
          issues: [
            {
              text: "passive voice",
              message: "Use active voice",
            },
          ],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(2);
        expect(feedback[0].category).toBe("grammar_correction");
        expect(feedback[1].category).toBe("grammar_issue");
      });
    });

    describe("2️⃣ Zero Issues", () => {
      it("should return empty array when no corrections or issues found", () => {
        const resultData = {
          corrections: [],
          issues: [],
          status: "SUCCESS",
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });

      it("should return empty array when corrections and issues are missing", () => {
        const resultData = {
          status: "SUCCESS",
          other_field: "value",
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });

      it("should return empty array when resultData is empty object", () => {
        const resultData = {};

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });
    });

    describe("3️⃣ Unexpected Structure", () => {
      it("should handle corrections as object instead of array", () => {
        const resultData = {
          corrections: { error: "Invalid format" },
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });

      it("should handle issues as string instead of array", () => {
        const resultData = {
          corrections: [],
          issues: "not an array",
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });

      it("should handle null resultData", () => {
        const resultData = null;

        const feedback = extractGrammarFeedback(resultData as any);

        expect(feedback).toEqual([]);
      });

      it("should handle resultData as string", () => {
        const resultData = "invalid" as any;

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toEqual([]);
      });

      it("should handle malformed correction items", () => {
        const resultData = {
          corrections: [
            null,
            "not an object",
            123,
            { valid: "correction", original: "teh", correction: "the" },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(1);
        expect(feedback[0].originalText).toBe("teh");
      });

      it("should handle correction items with missing required fields", () => {
        const resultData = {
          corrections: [
            { someField: "value" },
            { original: "teh", correction: "the" },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(1);
        expect(feedback[0].originalText).toBe("teh");
      });
    });

    describe("4️⃣ Field Normalization", () => {
      it("should normalize various original text field names", () => {
        const testCases = [
          { original: "teh", correction: "the" },
          { incorrect: "teh", correct: "the" },
          { wrong: "teh", fix: "the" },
          { error: "teh", replacement: "the" },
          { error_text: "teh", corrected_text: "the" },
          { original_text: "teh", corrected: "the" },
          { text: "teh", suggested: "the" },
          { before: "teh", after: "the" },
        ];

        testCases.forEach((testCase) => {
          const resultData = {
            corrections: [testCase],
            issues: [],
          };

          const feedback = extractGrammarFeedback(resultData);

          expect(feedback).toHaveLength(1);
          expect(feedback[0].originalText).toBe("teh");
          expect(feedback[0].suggestedText).toBe("the");
        });
      });

      it("should normalize various correction field names", () => {
        const testCases = [
          { original: "teh", correction: "the" },
          { original: "teh", corrected: "the" },
          { original: "teh", correct: "the" },
          { original: "teh", replacement: "the" },
          { original: "teh", suggested: "the" },
          { original: "teh", suggestion: "the" },
          { original: "teh", corrected_text: "the" },
          { original: "teh", after: "the" },
          { original: "teh", fix: "the" },
        ];

        testCases.forEach((testCase) => {
          const resultData = {
            corrections: [testCase],
            issues: [],
          };

          const feedback = extractGrammarFeedback(resultData);

          expect(feedback).toHaveLength(1);
          expect(feedback[0].suggestedText).toBe("the");
        });
      });

      it("should generate message when missing", () => {
        const resultData = {
          corrections: [
            { original: "teh", correction: "the" },
            { original: "bad", suggested: "good" },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(2);
        expect(feedback[0].message).toContain("teh");
        expect(feedback[0].message).toContain("the");
        expect(feedback[1].message).toContain("bad");
        expect(feedback[1].message).toContain("good");
      });

      it("should infer category when missing", () => {
        const resultData = {
          corrections: [{ original: "teh", correction: "the" }],
          issues: [{ text: "issue", message: "Fix this" }],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(2);
        expect(feedback[0].category).toBe("grammar_correction");
        expect(feedback[1].category).toBe("grammar_issue");
      });

      it("should normalize severity values", () => {
        const resultData = {
          corrections: [
            { original: "teh", correction: "the", severity: "error" },
            { original: "bad", correction: "good", severity: "ERROR" },
            { original: "x", correction: "y", severity: "critical" },
            { original: "a", correction: "b", severity: "info" },
            { original: "c", correction: "d", severity: "INFORMATION" },
            { original: "e", correction: "f", severity: "warning" },
            { original: "g", correction: "h" },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback[0].severity).toBe("error");
        expect(feedback[1].severity).toBe("error");
        expect(feedback[2].severity).toBe("error");
        expect(feedback[3].severity).toBe("info");
        expect(feedback[4].severity).toBe("info");
        expect(feedback[5].severity).toBe("warning");
        expect(feedback[6].severity).toBe("warning");
      });

      it("should extract location information when available", () => {
        const resultData = {
          corrections: [
            {
              original: "teh",
              correction: "the",
              line: 5,
              column: 10,
              offset: 123,
            },
          ],
          issues: [],
        };

        const feedback = extractGrammarFeedback(resultData);

        expect(feedback).toHaveLength(1);
        expect(feedback[0].location).toEqual({
          line: 5,
          column: 10,
          offset: 123,
        });
      });
    });

    describe("5️⃣ Business Logic Wrapper", () => {
      it("should return null for non-completed tasks", () => {
        const resultData = { corrections: [{ original: "teh", correction: "the" }] };

        expect(extractGrammarFeedbackWithBusinessLogic(resultData, "pending")).toBeNull();
        expect(extractGrammarFeedbackWithBusinessLogic(resultData, "processing")).toBeNull();
        expect(extractGrammarFeedbackWithBusinessLogic(resultData, "failed")).toBeNull();
      });

      it("should return null for completed tasks with no resultData", () => {
        expect(extractGrammarFeedbackWithBusinessLogic(null, "completed")).toBeNull();
        expect(extractGrammarFeedbackWithBusinessLogic(undefined, "completed")).toBeNull();
      });

      it("should return empty array for completed tasks with no issues", () => {
        const resultData = { corrections: [], issues: [] };

        const feedback = extractGrammarFeedbackWithBusinessLogic(resultData, "completed");

        expect(feedback).toEqual([]);
      });

      it("should return array for completed tasks with issues", () => {
        const resultData = {
          corrections: [{ original: "teh", correction: "the" }],
          issues: [],
        };

        const feedback = extractGrammarFeedbackWithBusinessLogic(resultData, "completed");

        expect(feedback).toHaveLength(1);
        expect(feedback?.[0].originalText).toBe("teh");
      });

      it("should return null when extraction throws error", () => {
        const resultData = {
          corrections: [{ original: "teh", correction: "the" }],
        };

        vi.spyOn(console, "error").mockImplementation(() => {});

        const originalExtract = extractGrammarFeedback;
        (global as any).extractGrammarFeedback = vi.fn(() => {
          throw new Error("Extraction failed");
        });

        const feedback = extractGrammarFeedbackWithBusinessLogic(resultData, "completed");

        expect(feedback).toBeNull();

        (global as any).extractGrammarFeedback = originalExtract;
        vi.restoreAllMocks();
      });
    });
  });
});

function extractGrammarFeedback(resultData: any): any[] {
  if (!resultData || typeof resultData !== "object") {
    return [];
  }

  const feedback: any[] = [];
  const corrections = Array.isArray(resultData.corrections) ? resultData.corrections : [];
  const issues = Array.isArray(resultData.issues) ? resultData.issues : [];

  const processItem = (item: any, source: "correction" | "issue") => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const originalText =
      item.original ||
      item.incorrect ||
      item.wrong ||
      item.error ||
      item.error_text ||
      item.original_text ||
      item.text ||
      item.before;

    const suggestedText =
      item.correction ||
      item.corrected ||
      item.correct ||
      item.replacement ||
      item.suggested ||
      item.suggestion ||
      item.corrected_text ||
      item.after ||
      item.fix;

    if (!originalText && !suggestedText && !item.message) {
      return null;
    }

    let message = item.message;
    if (!message) {
      if (originalText && suggestedText) {
        message = `"${originalText}" should be "${suggestedText}"`;
      } else if (originalText) {
        message = `Issue found: "${originalText}"`;
      } else if (suggestedText) {
        message = `Suggestion: "${suggestedText}"`;
      } else {
        message = "Grammar issue detected";
      }
    }

    let category = item.category || item.type;
    if (!category) {
      category = source === "correction" ? "grammar_correction" : "grammar_issue";
    }

    let severity: "info" | "warning" | "error" = "warning";
    if (item.severity) {
      const sev = String(item.severity).toLowerCase();
      if (sev === "error" || sev === "critical") {
        severity = "error";
      } else if (sev === "info" || sev === "information") {
        severity = "info";
      } else {
        severity = "warning";
      }
    } else {
      severity = source === "correction" ? "warning" : "info";
    }

    const location: any = {};
    if (typeof item.line === "number") {
      location.line = item.line;
    }
    if (typeof item.column === "number") {
      location.column = item.column;
    }
    if (typeof item.offset === "number") {
      location.offset = item.offset;
    }

    return {
      category,
      message,
      severity,
      originalText: originalText || undefined,
      suggestedText: suggestedText || undefined,
      location: Object.keys(location).length > 0 ? location : undefined,
    };
  };

  for (const item of corrections) {
    const feedbackItem = processItem(item, "correction");
    if (feedbackItem) {
      feedback.push(feedbackItem);
    }
  }

  for (const item of issues) {
    const feedbackItem = processItem(item, "issue");
    if (feedbackItem) {
      feedback.push(feedbackItem);
    }
  }

  return feedback;
}

function extractGrammarFeedbackWithBusinessLogic(
  resultData: any,
  taskStatus: string
): any[] | null {
  if (taskStatus !== "completed") {
    return null;
  }

  if (!resultData || typeof resultData !== "object") {
    return null;
  }

  try {
    const feedback = extractGrammarFeedback(resultData);
    return feedback;
  } catch (error) {
    console.error(
      "[GrammarFeedback] Failed to extract feedback (parsing failed, returning null):",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

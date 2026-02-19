import { validateFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../../lib/security";

describe("validateFile", () => {
  it("should return valid: true for a valid file", () => {
    const file = new File(["content"], "test.png", { type: "image/png" });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it("should return valid: false for an invalid MIME type", () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type: text/plain");
  });

  it("should return valid: false if file size exceeds the limit", () => {
    const file = new File([""], "large.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE + 1 });

    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("File exceeds 50MB limit");
  });

  it("should return valid: true if file size is exactly the limit", () => {
    const file = new File([""], "limit.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE });

    expect(validateFile(file)).toEqual({ valid: true });
  });

  it("should validate all allowed MIME types", () => {
    ALLOWED_MIME_TYPES.forEach((mimeType) => {
      const file = new File([""], `test${mimeType.replace("/", ".")}`, {
        type: mimeType,
      });
      expect(validateFile(file)).toEqual({ valid: true });
    });
  });
});

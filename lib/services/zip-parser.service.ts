import { load } from "cheerio";
import JSZip from "jszip";

export type ZipEntry = {
  name: string;
  content: Buffer;
  type: string;
  isDependency: boolean;
};

export const ZipParserService = {
  async parseAndIdentifyDependencies(zipBuffer: Buffer): Promise<ZipEntry[]> {
    const zip = await JSZip.loadAsync(zipBuffer);
    const entries: ZipEntry[] = [];
    let htmlContent = "";

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (
        file.dir ||
        relativePath.startsWith("__") ||
        relativePath.startsWith(".")
      )
        continue;

      const rawContent = await file.async("nodebuffer");
      let content = rawContent;
      const type = this.guessType(relativePath);

      // Check for UTF-16 BOM and convert to UTF-8 if detected
      // UTF-16 LE BOM: 0xFF 0xFE
      // UTF-16 BE BOM: 0xFE 0xFF
      if (
        (type === "text/html" || type.startsWith("text/")) &&
        content.length >= 2
      ) {
        if (content[0] === 0xff && content[1] === 0xfe) {
          // UTF-16 LE
          const str = content.toString("utf16le");
          content = Buffer.from(str, "utf-8");
        } else if (content[0] === 0xfe && content[1] === 0xff) {
          // UTF-16 BE
          content.swap16();
          const str = content.toString("utf16le");
          content = Buffer.from(str, "utf-8");
        }
      }

      entries.push({
        name: relativePath,
        content,
        type,
        isDependency: false,
      });

      if (type === "text/html" && !htmlContent) {
        htmlContent = content.toString("utf-8");
      }
    }

    if (htmlContent) {
      const dependencies = this.extractAssetReferences(htmlContent);

      entries.forEach((entry) => {
        const isReferenced = dependencies.some(
          (dep) => entry.name.endsWith(dep) || dep.endsWith(entry.name)
        );

        if (isReferenced && entry.type !== "text/html") {
          entry.isDependency = true;
        }
      });
    }

    return entries;
  },

  extractAssetReferences(html: string): string[] {
    const $ = load(html);
    const refs: string[] = [];

    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http") && !src.startsWith("//"))
        refs.push(src);
    });

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http") && !href.startsWith("//"))
        refs.push(href);
    });
    $("script").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http") && !src.startsWith("//"))
        refs.push(src);
    });

    return refs.map((ref) => ref.trim());
  },

  guessType(name: string) {
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name))
      return "image/" + name.split(".").pop();
    if (/\.html?$/i.test(name)) return "text/html";
    if (/\.css$/i.test(name)) return "text/css";
    if (/\.js$/i.test(name)) return "application/javascript";
    return "application/octet-stream";
  },
};

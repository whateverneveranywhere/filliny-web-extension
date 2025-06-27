import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Upload } from "lucide-react";
import mammoth from "mammoth";
import { useCallback, useState } from "react";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type React from "react";

// Function to process PDF files - only imported in browser
const processPDF = async (file: File): Promise<string> => {
  if (typeof window === "undefined") {
    throw new Error("PDF processing is only available in browser environments");
  }

  // Dynamically import PDF.js only in the browser
  const pdfjsLib = await import("pdfjs-dist");

  // Set the worker source to use the extension's own worker file
  // The worker should be included in the extension's assets
  if (typeof chrome !== "undefined" && chrome.runtime) {
    // Use the extension's assets path for Chrome extensions
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("assets/pdf.worker.js");
  } else {
    // Fallback for non-extension environments (not used in this case)
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const textContent = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Use type assertion for content.items to avoid TypeScript errors
    type PossibleTextItem = { str?: string; [key: string]: unknown };

    const pageText = content.items
      .filter((item: PossibleTextItem) => typeof item === "object" && item && "str" in item)
      .map((item: PossibleTextItem) => String(item.str))
      .join(" ");
    textContent.push(pageText);
  }

  return textContent.join("\n\n");
};

interface RHFShadcnFileDropProps {
  name: string;
  title?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  accept?: string;
  helperText?: string;
}

const RHFShadcnFileDrop = ({
  name,
  title,
  placeholder,
  rows = 4,
  className,
  accept = ".docx,.pdf,.xlsx,.txt,.csv,.rtf,.md",
  helperText,
}: RHFShadcnFileDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const {
    field,
    fieldState: { error },
  } = useController({ name });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      let extractedText = "";

      switch (fileType) {
        case "txt":
        case "md": {
          extractedText = await file.text();
          break;
        }

        case "docx": {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
          break;
        }

        case "pdf": {
          try {
            extractedText = await processPDF(file);
          } catch (error) {
            console.error("PDF processing error:", error);
            throw new Error("Failed to process PDF file. PDF.js may not be available in this environment.");
          }
          break;
        }

        case "xlsx":
        case "xls": {
          const xlsxBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(xlsxBuffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          extractedText = XLSX.utils.sheet_to_txt(firstSheet);
          break;
        }

        case "csv": {
          const csvBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(csvBuffer, { type: "array", raw: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          extractedText = XLSX.utils.sheet_to_txt(firstSheet);
          break;
        }

        case "rtf": {
          // For RTF files, we'll just read them as text for now
          // A proper RTF parser could be added later if needed
          extractedText = await file.text();
          break;
        }

        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!extractedText.trim()) {
        throw new Error("No text content could be extracted from the file");
      }

      field.onChange(extractedText);
      toast.success("File processed successfully");
    } catch (error) {
      console.error("File processing error:", error);
      toast.error(error instanceof Error ? error.message : "Error processing file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      const acceptedTypes = accept.split(",").map(type => type.replace(".", "").toLowerCase());
      if (!acceptedTypes.some(type => file.name.toLowerCase().endsWith(type))) {
        toast.error(`Invalid file type. Supported types: ${accept}`);
        return;
      }

      await processFile(file);
    },
    [accept],
  );

  const handleFileClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processFile(file);
      }
    };
    input.click();
  }, [accept]);

  return (
    <div className="filliny-space-y-2">
      {title && (
        <label className="filliny-text-sm filliny-font-medium filliny-leading-none filliny-peer-disabled:filliny-cursor-not-allowed filliny-peer-disabled:filliny-opacity-70">
          {title}
        </label>
      )}
      <div
        className={cn(
          "filliny-relative filliny-rounded-md filliny-border filliny-border-input filliny-transition-all filliny-duration-300",
          isDragging && "filliny-border-primary filliny-bg-accent/50 filliny-scale-[1.02] filliny-shadow-lg",
          isHovering && !isDragging && "filliny-border-muted-foreground filliny-shadow-sm",
          className,
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}>
        <Textarea
          {...field}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            "filliny-min-h-[80px] filliny-w-full filliny-resize-none filliny-bg-transparent filliny-p-3 filliny-transition-opacity filliny-duration-300",
            isDragging && "filliny-opacity-50",
          )}
        />
        <div
          className={cn(
            "filliny-absolute filliny-inset-0 filliny-flex filliny-items-center filliny-justify-center filliny-bg-background/80 filliny-backdrop-blur-sm filliny-transition-all filliny-duration-300",
            isDragging
              ? "filliny-opacity-100 filliny-scale-100"
              : "filliny-opacity-0 filliny-scale-95 filliny-pointer-events-none",
          )}>
          <div className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-3 filliny-transform filliny-transition-transform filliny-duration-300 filliny-ease-out">
            <Upload
              className={cn(
                "filliny-h-10 filliny-w-10 filliny-text-muted-foreground filliny-transition-all filliny-duration-300",
                isDragging && "filliny-scale-125 filliny-text-primary filliny-animate-bounce",
              )}
            />
            <span
              className={cn(
                "filliny-text-center filliny-text-sm filliny-text-muted-foreground filliny-transition-colors filliny-duration-300",
                isDragging && "filliny-text-primary filliny-font-medium",
              )}>
              Drop your file here to extract content
            </span>
            <span className="filliny-text-xs filliny-text-muted-foreground filliny-max-w-[80%] filliny-text-center">
              Supports {accept.replace(/\./g, "")} files
            </span>
          </div>
        </div>
        {isProcessing && (
          <div className="filliny-absolute filliny-inset-0 filliny-flex filliny-flex-col filliny-gap-3 filliny-items-center filliny-justify-center filliny-bg-background/90 filliny-backdrop-blur-sm filliny-animate-in filliny-fade-in filliny-duration-300">
            <Loader2 className="filliny-h-8 filliny-w-8 filliny-animate-spin filliny-text-primary" />
            <span className="filliny-text-sm filliny-text-muted-foreground">Extracting content...</span>
          </div>
        )}
      </div>
      <div className="filliny-flex filliny-w-full filliny-justify-end filliny-animate-in filliny-fade-in-25 filliny-duration-300">
        <Button type="button" size="sm" variant="outline" className={cn("filliny-w-full")} onClick={handleFileClick}>
          <FileText className="filliny-h-4 filliny-w-4" />
          Upload file
        </Button>
      </div>
      {!error && (helperText || accept) && (
        <div className="filliny-flex filliny-items-center filliny-mt-1 filliny-animate-in filliny-fade-in filliny-duration-300">
          <p className="filliny-text-xs filliny-text-muted-foreground">
            {helperText || `Drag and drop files (${accept.replace(/\./g, "")}) to automatically extract content.`}
          </p>
        </div>
      )}

      {error && (
        <p className="filliny-text-sm filliny-text-destructive filliny-flex filliny-items-center filliny-gap-1 filliny-animate-in filliny-slide-in-from-bottom-2 filliny-duration-300">
          <span className="filliny-rounded-full filliny-bg-destructive/20 filliny-p-0.5 filliny-flex filliny-items-center filliny-justify-center">
            <span className="filliny-h-1 filliny-w-1 filliny-rounded-full filliny-bg-destructive" />
          </span>
          {error.message}
        </p>
      )}
    </div>
  );
};

export default RHFShadcnFileDrop;

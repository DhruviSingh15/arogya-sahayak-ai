import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { useDocumentIngestion, DocumentIngestionRequest } from '@/hooks/useDocumentIngestion';

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  language: 'en' | 'hi';
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: any;
  error?: string;
}

export function FileUpload({ onUploadComplete, language }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { ingestDocument, isLoading } = useDocumentIngestion();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
      'text/html': ['.html'],
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const processFile = async (uploadFile: UploadFile, index: number) => {
    const { file } = uploadFile;
    
    try {
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading', progress: 20 } : f
      ));

      // Read file content
      const content = await readFileContent(file);
      
      // Update progress
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 60 } : f
      ));

      // Prepare document data
      const docData: DocumentIngestionRequest & { file_type?: string } = {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        content,
        doc_type: detectDocType(file.name),
        language,
        tags: [file.type, 'uploaded'],
        file_type: file.type,
      };

      // Ingest document
      const result = await ingestDocument(docData);
      
      if (result) {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            result 
          } : f
        ));
        onUploadComplete?.(result);
      } else {
        throw new Error('Ingestion failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: errorMessage 
        } : f
      ));
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // For text files, validate content length
        if (file.type.startsWith('text/') || file.type === 'application/json') {
          if (!result || result.trim().length < 50) {
            reject(new Error('File content is too short (minimum 50 characters)'));
          } else {
            resolve(result);
          }
        } else {
          // For binary files (PDF, images), return base64
          resolve(result);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // Read as text for text files, as data URL for binary files
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const detectDocType = (filename: string): DocumentIngestionRequest['doc_type'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('legal') || lower.includes('law') || lower.includes('court')) return 'legal';
    if (lower.includes('medical') || lower.includes('health') || lower.includes('patient')) return 'medical';
    if (lower.includes('policy') || lower.includes('guideline')) return 'policy';
    return 'general';
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await processFile(files[i], i);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload TXT, MD, JSON, HTML, PDF, or image files (max 20MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supported: TXT, MD, JSON, HTML, PDF, JPG, PNG, WEBP
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Files ({files.length})</h4>
                <div className="space-x-2">
                  <Button 
                    onClick={uploadAll} 
                    disabled={isLoading || files.every(f => f.status !== 'pending')}
                    size="sm"
                  >
                    Upload All
                  </Button>
                  <Button 
                    onClick={clearAll} 
                    variant="outline" 
                    size="sm"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {files.map((uploadFile, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={uploadFile.progress} className="h-1" />
                    </div>
                  )}
                  
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
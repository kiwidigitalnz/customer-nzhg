
import React from 'react';
import { FileIcon, ExternalLink, FileText, File, FileSpreadsheet, FileImage } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentFile {
  id: number;
  name: string;
  link: string;
  size?: string;
  mimetype?: string;
}

interface DocumentsTabProps {
  details: {
    [key: string]: any;
  };
  files?: DocumentFile[];
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ details, files = [] }) => {
  // Helper function to get appropriate icon based on file mimetype/name
  const getFileIcon = (file: DocumentFile) => {
    const name = file.name.toLowerCase();
    const mimetype = file.mimetype?.toLowerCase() || '';
    
    if (mimetype.includes('pdf') || name.endsWith('.pdf')) {
      return <File className="h-5 w-5 text-red-500" />; // Changed from FilePdf to File with red color
    } else if (mimetype.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv') || name.endsWith('.xls')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    } else if (mimetype.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (mimetype.includes('text') || name.endsWith('.txt') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format file size for display
  const formatFileSize = (size?: string) => {
    if (!size) return '';
    
    const sizeNum = parseInt(size, 10);
    if (isNaN(sizeNum)) return size;
    
    if (sizeNum < 1024) {
      return `${sizeNum} B`;
    } else if (sizeNum < 1024 * 1024) {
      return `${(sizeNum / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Documents</h2>
      
      {files && files.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        {file.size && <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.open(file.link, '_blank')}
                      className="flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertDescription>
            No documents are currently associated with this specification.
          </AlertDescription>
        </Alert>
      )}

      {/* Additional documentation sections from other fields */}
      {details.palletDocuments && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Pallet Documentation</h3>
          <Separator className="mb-4" />
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: details.palletDocuments }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;

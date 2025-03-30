
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserSignatureHistory } from '@/services/userPreferences';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface SavedSignaturesProps {
  onSelect: (dataUrl: string) => void;
}

const SavedSignatures: React.FC<SavedSignaturesProps> = ({ onSelect }) => {
  const signatures = getUserSignatureHistory();
  
  if (signatures.length === 0) {
    return null;
  }
  
  return (
    <Card className="mb-4 border-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-800">Previous Signatures</CardTitle>
        <CardDescription className="text-xs text-blue-600">
          Click on a signature to use it
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {signatures.map((signature, index) => (
            <Button
              key={index}
              variant="outline"
              className="p-0 h-auto border-blue-200 hover:border-blue-400 bg-white"
              onClick={() => onSelect(signature.dataUrl)}
            >
              <div className="flex flex-col items-center p-1">
                <img 
                  src={signature.dataUrl} 
                  alt={`Saved signature by ${signature.name}`} 
                  className="h-12 w-auto object-contain mb-1"
                />
                <div className="text-xs text-blue-700 font-medium truncate max-w-[90px]">
                  {signature.name}
                </div>
                <div className="text-[10px] text-blue-500">
                  {formatDistanceToNow(signature.timestamp, { addSuffix: true })}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedSignatures;

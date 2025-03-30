
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Check } from 'lucide-react';
import { saveUserSignature } from '@/services/userPreferences';
import { useToast } from '@/components/ui/use-toast';
import SavedSignatures from './SavedSignatures';

interface ResponsiveSignaturePadProps {
  onSigned: (dataUrl: string) => void;
  name: string;
}

const ResponsiveSignaturePad: React.FC<ResponsiveSignaturePadProps> = ({ onSigned, name }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions to match container size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 150; // Fixed height for signature
    }
    
    const context = canvas.getContext('2d');
    if (context) {
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#000000';
      setCtx(context);
    }
    
    // Check if device is mobile
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    
    // Handle window resize
    const handleResize = () => {
      if (container) {
        canvas.width = container.clientWidth;
        // Redraw the signature if there is one
        if (hasSigned && context) {
          // If we had content, we'd need to redraw it here
          // For now, just clear it
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasSigned]);
  
  // Mouse event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    
    setDrawing(true);
    setHasSigned(true);
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setLastPoint({ x, y });
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !ctx || !lastPoint) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPoint({ x, y });
  };
  
  // Touch event handlers
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    e.preventDefault(); // Prevent scrolling when drawing
    
    setDrawing(true);
    setHasSigned(true);
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setLastPoint({ x, y });
  };
  
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing || !ctx || !lastPoint) return;
    e.preventDefault(); // Prevent scrolling when drawing
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPoint({ x, y });
  };
  
  const stopDrawing = () => {
    if (drawing && ctx) {
      ctx.closePath();
    }
    setDrawing(false);
  };
  
  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSigned(false);
  };
  
  const saveSignature = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSigned(dataUrl);
    
    // Save for future use
    saveUserSignature(dataUrl, name);
    
    toast({
      title: "Signature saved",
      description: "Your signature has been saved and can be reused for future approvals.",
    });
  };
  
  const handleSelectSavedSignature = (dataUrl: string) => {
    if (!ctx || !canvasRef.current) return;
    
    // Clear the canvas
    clearCanvas();
    
    // Load the selected signature
    const img = new Image();
    img.onload = () => {
      if (!ctx || !canvasRef.current) return;
      
      // Calculate dimensions to fit canvas while maintaining aspect ratio
      const canvas = canvasRef.current;
      const maxHeight = canvas.height - 10; // Leave some margin
      const ratio = img.width / img.height;
      const newHeight = Math.min(maxHeight, img.height);
      const newWidth = newHeight * ratio;
      
      // Center the image horizontally
      const x = (canvas.width - newWidth) / 2;
      const y = (canvas.height - newHeight) / 2;
      
      ctx.drawImage(img, x, y, newWidth, newHeight);
      setHasSigned(true);
      
      // Let the parent component know about the signature
      onSigned(dataUrl);
    };
    img.src = dataUrl;
  };
  
  return (
    <div className="space-y-2">
      <SavedSignatures onSelect={handleSelectSavedSignature} />
      
      {isMobile && (
        <div className="bg-blue-50 p-2 rounded-md mb-2 text-xs text-blue-700">
          <strong>Tip:</strong> Turn your device to landscape orientation for a better signing experience.
        </div>
      )}
      
      <div className="border-2 border-dashed border-gray-300 rounded-md p-1 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawingTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopDrawing}
        />
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {hasSigned ? "Your signature is ready" : "Draw your signature above"}
      </div>
      
      <div className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearCanvas}
          className="text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" /> Clear
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveSignature}
            disabled={!hasSigned}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" /> Save for reuse
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (canvasRef.current) {
                onSigned(canvasRef.current.toDataURL('image/png'));
              }
            }}
            disabled={!hasSigned}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" /> Use Signature
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveSignaturePad;

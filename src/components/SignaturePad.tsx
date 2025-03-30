
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Save, RefreshCw, Pen, Type } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  defaultName?: string;
  initialData?: string; // Added initialData prop for existing signature
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, defaultName = '', initialData = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [typedName, setTypedName] = useState(defaultName);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.strokeStyle = '#000';
      setCtx(context);
      
      // If initialData is provided, load it into the canvas
      if (initialData) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0);
        };
        img.src = initialData;
      }
    }
  }, [initialData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) return;

      // Save current drawing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize canvas
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Restore context properties
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';

      // Restore drawing
      ctx.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ctx]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    setIsDrawing(true);
    
    // Get position
    const position = getEventPosition(e);
    if (!position) return;
    
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    
    // Prevent scrolling when drawing
    e.preventDefault();
    
    // Get position
    const position = getEventPosition(e);
    if (!position) return;
    
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    setIsDrawing(false);
    ctx.closePath();
  };

  const getEventPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    let clientX, clientY;
    
    // Handle touch events
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Mouse events
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Get canvas position
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveSignature = () => {
    if (signatureMode === 'draw' && canvasRef.current) {
      // Save drawn signature
      onSave(canvasRef.current.toDataURL('image/jpeg'));
    } else if (signatureMode === 'type' && typedName.trim()) {
      // Create signature from typed name
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 150;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'italic 32px cursive';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(typedName, canvas.width / 2, canvas.height / 2);
        onSave(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  const renderTypedSignature = () => {
    return (
      <div className="flex flex-col items-center space-y-4 py-4 h-full">
        <Input 
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Type your full name"
          className="max-w-xs"
        />
        <div className="border rounded-md p-4 w-full max-w-xs min-h-[100px] flex items-center justify-center">
          <p className="text-lg italic font-medium">{typedName}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="draw" onValueChange={(value) => setSignatureMode(value as 'draw' | 'type')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="draw" className="flex items-center">
            <Pen className="mr-2 h-4 w-4" /> Draw Signature
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center">
            <Type className="mr-2 h-4 w-4" /> Type Signature
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="draw" className="space-y-4">
          <div className="border rounded-md bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[200px] touch-none cursor-crosshair"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={clearCanvas}>
              <RefreshCw className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="type">
          {renderTypedSignature()}
        </TabsContent>
      </Tabs>
      
      <div className="mt-4">
        <Button 
          onClick={saveSignature}
          className="w-full"
          disabled={(signatureMode === 'draw' && !ctx) || (signatureMode === 'type' && !typedName.trim())}
        >
          <Save className="mr-2 h-4 w-4" /> Save Signature
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

interface ApprovalChecklistProps {
  onComplete: (completed: boolean) => void;
}

// Simplified checklist items
const defaultItems: ChecklistItem[] = [
  { id: 'product_details', label: 'I have reviewed all product details', required: true },
  { id: 'specifications', label: 'I have verified the specifications are correct', required: true },
  { id: 'regulatory', label: 'I confirm all regulatory requirements are met', required: true },
];

const ApprovalChecklist: React.FC<ApprovalChecklistProps> = ({ onComplete }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showChecklist, setShowChecklist] = useState<boolean>(true);
  
  const handleItemCheck = (id: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: checked
    }));
  };
  
  // Check if all required items are checked
  const allRequiredChecked = defaultItems
    .filter(item => item.required)
    .every(item => checkedItems[item.id]);
  
  // Calculate percentage of completed items
  const completedCount = Object.values(checkedItems).filter(val => val).length;
  const totalCount = defaultItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);
  
  const handleContinue = () => {
    setShowChecklist(false);
    onComplete(allRequiredChecked);
  };
  
  if (!showChecklist) {
    return null;
  }
  
  return (
    <Card className="mb-6 border-amber-200 bg-amber-50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-800 flex items-center text-lg">
          <CheckCircle2 className="mr-2 h-5 w-5 text-amber-600" />
          Quick Approval Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-amber-700 mb-4">
          Please confirm you have reviewed the following before approval:
        </div>
        
        <div className="space-y-3 mb-4">
          {defaultItems.map(item => (
            <div key={item.id} className="flex items-start space-x-2">
              <Checkbox 
                id={item.id}
                checked={checkedItems[item.id] || false}
                onCheckedChange={(checked) => handleItemCheck(item.id, checked === true)}
                className={item.required ? "border-amber-600" : "border-amber-400"}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor={item.id}
                  className={`text-sm font-medium leading-none cursor-pointer ${
                    item.required ? "text-amber-900" : "text-amber-700"
                  }`}
                >
                  {item.label}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-amber-700">
            {!allRequiredChecked && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Please check all required items
              </div>
            )}
            <div className="mt-1">
              Completion: {completionPercentage}% ({completedCount}/{totalCount})
            </div>
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={!allRequiredChecked}
            variant="secondary"
            className="bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalChecklist;

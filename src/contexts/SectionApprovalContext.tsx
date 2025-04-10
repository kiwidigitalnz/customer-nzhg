
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SectionStatus } from '@/components/packing-spec/SectionApproval';

export type SectionName = 'overview' | 'requirements' | 'packaging' | 'label' | 'shipping' | 'documents';

export interface SectionState {
  status: SectionStatus;
  comments?: string;
  approvedAt?: string;
}

interface SectionApprovalContextType {
  sectionStates: Record<SectionName, SectionState>;
  updateSectionStatus: (section: SectionName, status: SectionStatus, comments?: string) => void;
  allSectionsApproved: boolean;
  anySectionsWithChangesRequested: boolean;
  getSectionFeedback: () => Record<string, string>;
}

const SectionApprovalContext = createContext<SectionApprovalContextType | undefined>(undefined);

export const useSectionApproval = () => {
  const context = useContext(SectionApprovalContext);
  if (!context) {
    throw new Error('useSectionApproval must be used within a SectionApprovalProvider');
  }
  return context;
};

interface SectionApprovalProviderProps {
  children: ReactNode;
  initialStates?: Partial<Record<SectionName, SectionState>>;
  onSectionStatusChange?: (section: SectionName, status: SectionStatus, comments?: string) => void;
}

export const SectionApprovalProvider: React.FC<SectionApprovalProviderProps> = ({ 
  children,
  initialStates = {},
  onSectionStatusChange
}) => {
  const [sectionStates, setSectionStates] = useState<Record<SectionName, SectionState>>({
    overview: { status: 'pending' },
    requirements: { status: 'pending' },
    packaging: { status: 'pending' },
    label: { status: 'pending' },
    shipping: { status: 'pending' },
    documents: { status: 'pending' },
    ...initialStates
  });
  
  const updateSectionStatus = (section: SectionName, status: SectionStatus, comments?: string) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: {
        status,
        comments: comments || prev[section]?.comments,
        approvedAt: status === 'approved' ? new Date().toISOString() : prev[section]?.approvedAt
      }
    }));
    
    // Call the optional callback if provided
    if (onSectionStatusChange) {
      onSectionStatusChange(section, status, comments);
    }
  };
  
  const allSectionsApproved = Object.values(sectionStates).every(
    section => section.status === 'approved'
  );
  
  const anySectionsWithChangesRequested = Object.values(sectionStates).some(
    section => section.status === 'changes-requested'
  );
  
  // Helper function to get all section feedback for consolidation
  const getSectionFeedback = (): Record<string, string> => {
    const feedback: Record<string, string> = {};
    
    Object.entries(sectionStates).forEach(([section, state]) => {
      if (state.status === 'changes-requested' && state.comments) {
        feedback[section] = state.comments;
      }
    });
    
    return feedback;
  };
  
  return (
    <SectionApprovalContext.Provider value={{ 
      sectionStates, 
      updateSectionStatus,
      allSectionsApproved,
      anySectionsWithChangesRequested,
      getSectionFeedback
    }}>
      {children}
    </SectionApprovalContext.Provider>
  );
};

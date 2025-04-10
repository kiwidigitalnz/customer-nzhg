
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
}

export const SectionApprovalProvider: React.FC<SectionApprovalProviderProps> = ({ 
  children,
  initialStates = {}
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
  };
  
  const allSectionsApproved = Object.values(sectionStates).every(
    section => section.status === 'approved'
  );
  
  const anySectionsWithChangesRequested = Object.values(sectionStates).some(
    section => section.status === 'changes-requested'
  );
  
  return (
    <SectionApprovalContext.Provider value={{ 
      sectionStates, 
      updateSectionStatus,
      allSectionsApproved,
      anySectionsWithChangesRequested
    }}>
      {children}
    </SectionApprovalContext.Provider>
  );
};

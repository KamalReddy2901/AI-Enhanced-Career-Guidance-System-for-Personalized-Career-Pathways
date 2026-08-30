import { useState, useMemo } from 'react';
import type { EvidenceRecord, VerificationState, EvidenceVisibility } from '../../domain/evidence';

export interface EvidenceFilters {
  verificationState?: VerificationState | 'all';
  visibility?: EvidenceVisibility | 'all';
  searchQuery?: string;
}

export function useEvidenceFilters(evidenceList: EvidenceRecord[], initialFilters?: EvidenceFilters) {
  const [filters, setFilters] = useState<EvidenceFilters>(initialFilters ?? { verificationState: 'all', visibility: 'all', searchQuery: '' });

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((record) => {
      if (filters.verificationState && filters.verificationState !== 'all' && record.verificationState !== filters.verificationState) {
        return false;
      }
      if (filters.visibility && filters.visibility !== 'all' && record.visibility !== filters.visibility) {
        return false;
      }
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        if (!record.literalClaim.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [evidenceList, filters]);

  return {
    filters,
    setFilters,
    filteredEvidence,
  };
}

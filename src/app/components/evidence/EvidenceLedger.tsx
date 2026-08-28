import React from 'react';
import type { EvidenceRecord } from '../../domain/evidence';
import { EvidenceCard } from './EvidenceCard';
import { useEvidenceFilters } from './useEvidenceFilters';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EvidenceLedgerProps {
  evidenceList: EvidenceRecord[];
  onEvidenceSelect?: (evidence: EvidenceRecord) => void;
}

export function EvidenceLedger({ evidenceList, onEvidenceSelect }: EvidenceLedgerProps) {
  const { filters, setFilters, filteredEvidence } = useEvidenceFilters(evidenceList);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <Input 
          placeholder="Search claims..." 
          value={filters.searchQuery ?? ''}
          onChange={(e: any) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
          className="max-w-xs"
        />
        <div className="flex gap-4">
          <Select 
            value={filters.verificationState ?? 'all'} 
            onValueChange={(val: any) => setFilters(f => ({ ...f, verificationState: val }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Verification State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="self_confirmed">Self Confirmed</SelectItem>
              <SelectItem value="human_verified">Human Verified</SelectItem>
              <SelectItem value="issuer_verified">Issuer Verified</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.visibility ?? 'all'} 
            onValueChange={(val: any) => setFilters(f => ({ ...f, visibility: val }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visibility</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="consented_application">Consented App</SelectItem>
              <SelectItem value="organization_scoped">Org Scoped</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvidence.length === 0 ? (
          <div className="col-span-full text-center p-8 text-muted-foreground border rounded-lg border-dashed">
            No evidence matches the current filters.
          </div>
        ) : (
          filteredEvidence.map(record => (
            <EvidenceCard 
              key={record.id} 
              evidence={record} 
              onClick={onEvidenceSelect} 
            />
          ))
        )}
      </div>
    </div>
  );
}

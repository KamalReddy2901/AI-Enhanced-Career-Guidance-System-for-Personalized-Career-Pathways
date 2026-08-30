import type { ApplicationReadModel } from '../../../services/sih/types';

interface Props {
  readonly applications: readonly ApplicationReadModel[];
  readonly selectedApplicationId?: string;
  readonly onSelect: (applicationId: string) => void;
}

export default function ApplicationListTable({ applications, selectedApplicationId, onSelect }: Props) {
  if (applications.length === 0) {
    return (
      <div className="border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0_#111]">
        <h3 className="mb-2 font-mono-ui text-sm font-black uppercase text-[#d63c1d]">
          No applications received
        </h3>
        <p className="text-sm text-black/70">
          There are currently no applications matching your filters or for this organization.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_#111]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[#111] text-white">
          <tr>
            <th className="border-b-2 border-black p-3 font-mono-ui text-[10px] font-black uppercase tracking-wide">
              Applicant ID
            </th>
            <th className="border-b-2 border-black p-3 font-mono-ui text-[10px] font-black uppercase tracking-wide">
              Stage
            </th>
            <th className="border-b-2 border-black p-3 font-mono-ui text-[10px] font-black uppercase tracking-wide">
              Applied At
            </th>
            <th className="border-b-2 border-black p-3 font-mono-ui text-[10px] font-black uppercase tracking-wide text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {applications.map(app => {
            const isSelected = app.id === selectedApplicationId;
            return (
              <tr
                key={app.id}
                className={`transition-colors ${isSelected ? 'bg-[#e7ff57]' : 'hover:bg-[#f7f4ed]'}`}
              >
                <td className="p-3 font-mono-ui text-[11px] font-bold">
                  {app.applicantActorId.substring(0, 8)}...
                </td>
                <td className="p-3">
                  <span className="bg-black px-2 py-1 font-mono-ui text-[9px] font-black uppercase text-white">
                    {app.currentStage.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 font-mono-ui text-[11px]">
                  {new Date(app.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(app.id)}
                    className="border-2 border-black bg-white px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
                  >
                    {isSelected ? 'Selected' : 'View'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

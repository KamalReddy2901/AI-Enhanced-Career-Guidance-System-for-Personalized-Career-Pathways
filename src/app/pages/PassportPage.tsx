import { useState } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sounds';
import { haptic } from '../utils/haptic';
import { extractProfileFromResume, type ResumeExtraction } from '../services/ai';
import { matchSkillsToKB, mergeSkillClaims, groupSkillsByCategory, estimateNSQFLevel } from '../engine/skillProfile';
import { skillById } from '../data/knowledge';

export function PassportPage() {
  const navigate = useNavigate();
  const { passport, updatePassport } = useGuidance();
  const { user } = useAuth();
  
  const [resumeText, setResumeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [unmatchedSkills, setUnmatchedSkills] = useState<string[]>([]);

  if (!passport) {
    return (
      <div className="min-h-screen bg-[#f9f8f7] p-6 flex flex-col items-center justify-center">
        <StickFigure pose="thinking" size={120} />
        <h2 className="mt-6 text-2xl font-[Playfair_Display] text-black">No passport yet</h2>
        <button
          onClick={() => navigate('/onboarding')}
          className="mt-4 px-6 py-2 bg-black text-white hover:bg-black/90 font-[Inter] text-sm"
        >
          Start Onboarding
        </button>
      </div>
    );
  }

  const handleResumeExtract = async () => {
    if (!resumeText.trim()) return;
    
    setIsExtracting(true);
    setExtractError('');
    setUnmatchedSkills([]);
    
    try {
      const extracted: ResumeExtraction = await extractProfileFromResume(resumeText);
      
      // Match skills to KB
      const { matched, unmatched } = matchSkillsToKB(
        extracted.skills.map(s => ({
          name: s.name,
          proficiency: s.proficiency,
          evidence: s.evidence,
        }))
      );
      
      setUnmatchedSkills(unmatched);
      
      // Merge into passport
      updatePassport(prev => ({
        ...prev!,
        skills: mergeSkillClaims(prev!.skills, matched),
        experiences: [
          ...prev!.experiences,
          ...extracted.experiences.filter(e => e.title.trim() && e.years > 0),
        ],
        education: extracted.education || prev!.education,
      }));
      
      sounds.success();
      haptic.medium();
      setResumeText('');
    } catch (err: any) {
      setExtractError(err.message || 'Failed to parse resume');
    } finally {
      setIsExtracting(false);
    }
  };

  const nsqfLevel = estimateNSQFLevel(passport.education);
  const groupedSkills = groupSkillsByCategory(passport.skills);

  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header "Identity Card" */}
        <div className="bg-white border-2 border-black/10 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-[Playfair_Display] text-black mb-1">Career Passport</h1>
              <div className="flex items-center gap-4 font-[JetBrains_Mono] text-xs text-black/60 uppercase tracking-wide">
                <span>{passport.segment.replace('_', ' ')}</span>
                <span>•</span>
                <span>NSQF ~{nsqfLevel}</span>
                <span>•</span>
                <span>v{passport.version}</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <svg width="80" height="80" viewBox="0 0 100 100" className="mb-1">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="black"
                  strokeWidth="8"
                  strokeDasharray={`${(passport.completeness / 100) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-[Playfair_Display] text-2xl fill-black"
                >
                  {passport.completeness}
                </text>
              </svg>
              <span className="font-[JetBrains_Mono] text-xs text-black/60">COMPLETE</span>
            </div>
          </div>
        </div>

        {/* Resume Extraction */}
        <div className="bg-white border border-black/10 p-6 mb-6">
          <h2 className="text-2xl font-[Playfair_Display] text-black mb-3">Add from Resume</h2>
          <p className="text-sm font-[Inter] text-black/60 mb-4">
            Paste your resume text below. We'll extract skills and experiences.
          </p>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste resume text here..."
            className="w-full h-32 p-3 border border-black/20 rounded-sm font-[Inter] text-sm resize-none mb-3"
            disabled={isExtracting}
          />
          {extractError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-800 text-sm font-[Inter] rounded-sm">
              {extractError}
            </div>
          )}
          {unmatchedSkills.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-sm font-[Inter] rounded-sm">
              <p className="font-semibold mb-1">Some skills couldn't be matched:</p>
              <p className="text-black/70">{unmatchedSkills.join(', ')}</p>
            </div>
          )}
          <button
            onClick={handleResumeExtract}
            disabled={!resumeText.trim() || isExtracting}
            className="px-6 py-2 bg-black text-white hover:bg-black/90 disabled:bg-black/20 disabled:text-black/40 font-[Inter] text-sm transition-colors"
          >
            {isExtracting ? 'Extracting...' : 'Extract Skills & Experience'}
          </button>
        </div>

        {/* Skills */}
        <div className="bg-white border border-black/10 p-6 mb-6">
          <h2 className="text-2xl font-[Playfair_Display] text-black mb-4">Skills</h2>
          {passport.skills.length === 0 ? (
            <p className="text-sm font-[Inter] text-black/50">No skills yet. Add from resume or complete assessments.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSkills).map(([category, claims]) => (
                <div key={category}>
                  <h3 className="font-[JetBrains_Mono] text-xs uppercase tracking-wide text-black/60 mb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {claims.map(claim => {
                      const skill = skillById.get(claim.skillId);
                      if (!skill) return null;
                      
                      return (
                        <div key={claim.skillId} className="flex items-start justify-between p-3 border border-black/5 rounded-sm hover:border-black/20 transition-colors">
                          <div>
                            <div className="font-[Inter] text-sm font-semibold text-black">{skill.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map(level => (
                                  <div
                                    key={level}
                                    className={`w-2 h-2 rounded-full ${
                                      level <= claim.proficiency ? 'bg-black' : 'bg-black/10'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-[JetBrains_Mono] text-xs text-black/50">
                                {claim.confidence < 0.7 ? 'unverified' : `${Math.round(claim.confidence * 100)}% confidence`}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              sounds.click();
                              // TODO: Open evidence popover
                            }}
                            className="text-xs font-[Inter] text-black/50 hover:text-black underline"
                          >
                            {claim.evidence.length} evidence
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experiences */}
        <div className="bg-white border border-black/10 p-6 mb-6">
          <h2 className="text-2xl font-[Playfair_Display] text-black mb-4">Experiences</h2>
          {passport.experiences.length === 0 ? (
            <p className="text-sm font-[Inter] text-black/50">No experiences yet.</p>
          ) : (
            <div className="space-y-3">
              {passport.experiences.map((exp, idx) => (
                <div key={idx} className="p-4 border border-black/5 rounded-sm">
                  <div className="font-[Inter] text-sm font-semibold text-black">{exp.title}</div>
                  <div className="font-[JetBrains_Mono] text-xs text-black/50 mt-1">
                    {exp.years} {exp.years === 1 ? 'year' : 'years'}
                  </div>
                  {exp.description && (
                    <p className="font-[Inter] text-sm text-black/70 mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessments */}
        <div className="bg-white border border-black/10 p-6 mb-6">
          <h2 className="text-2xl font-[Playfair_Display] text-black mb-4">Assessment Results</h2>
          <div className="space-y-4">
            {passport.riasec ? (
              <div className="p-4 border border-black/5 rounded-sm">
                <div className="font-[Inter] text-sm font-semibold mb-2">RIASEC Interest Profile</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-[JetBrains_Mono]">
                  {Object.entries(passport.riasec).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-black/10 rounded-sm text-center">
                <p className="font-[Inter] text-sm text-black/50 mb-2">No interest assessment yet</p>
                <button
                  onClick={() => navigate('/assess/interests')}
                  className="text-sm font-[Inter] text-black hover:underline"
                >
                  Take Assessment →
                </button>
              </div>
            )}

            {passport.aptitude ? (
              <div className="p-4 border border-black/5 rounded-sm">
                <div className="font-[Inter] text-sm font-semibold mb-2">Aptitude Scores</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-[JetBrains_Mono]">
                  {Object.entries(passport.aptitude).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-black/10 rounded-sm text-center">
                <p className="font-[Inter] text-sm text-black/50 mb-2">No aptitude assessment yet</p>
                <button
                  onClick={() => navigate('/assess/aptitude')}
                  className="text-sm font-[Inter] text-black hover:underline"
                >
                  Take Assessment →
                </button>
              </div>
            )}

            {passport.values ? (
              <div className="p-4 border border-black/5 rounded-sm">
                <div className="font-[Inter] text-sm font-semibold mb-2">Work Values</div>
                <div className="space-y-1 text-xs font-[JetBrains_Mono]">
                  {Object.entries(passport.values)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span>{val}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-black/10 rounded-sm text-center">
                <p className="font-[Inter] text-sm text-black/50 mb-2">No values assessment yet</p>
                <button
                  onClick={() => navigate('/assess/values')}
                  className="text-sm font-[Inter] text-black hover:underline"
                >
                  Take Assessment →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aspiration */}
        {passport.aspiration && (
          <div className="bg-white border border-black/10 p-6 mb-6">
            <h2 className="text-2xl font-[Playfair_Display] text-black mb-3">Aspiration</h2>
            <p className="font-[Inter] text-sm text-black/80 mb-2">{passport.aspiration.statement}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {passport.aspiration.themes.map(theme => (
                <span key={theme} className="px-3 py-1 bg-black/5 border border-black/10 rounded-full text-xs font-[Inter]">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        <div className="bg-white border border-black/10 p-6">
          <h2 className="text-2xl font-[Playfair_Display] text-black mb-4">Constraints</h2>
          <div className="grid grid-cols-2 gap-4 text-sm font-[Inter]">
            <div>
              <span className="text-black/60">Location:</span>{' '}
              <span className="text-black">{passport.constraints.location}</span>
            </div>
            <div>
              <span className="text-black/60">Relocation:</span>{' '}
              <span className="text-black">{passport.constraints.canRelocate ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-black/60">Learning hours/week:</span>{' '}
              <span className="text-black">{passport.constraints.weeklyLearningHours}h</span>
            </div>
            <div>
              <span className="text-black/60">Budget:</span>{' '}
              <span className="text-black">{passport.constraints.budgetLevel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PassportPage;

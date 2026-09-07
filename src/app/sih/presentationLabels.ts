import { isPresentationMode } from '../components/PresentationSwitcher';

/** Judge-facing aliases only. Authoritative organization records remain untouched. */
export function presentationOrganizationName(authoritativeName: string): string {
  if (!isPresentationMode()) return authoritativeName;
  const name = authoritativeName.trim();
  if (/test institute|controlled.*institute/i.test(name)) return 'All India Institute of Ayurveda';
  if (/test issuer|controlled.*issuer/i.test(name)) return 'Academic Verification Partner';
  if (/government program/i.test(name)) return 'National Skills Mission';
  if (/controlled|fixture|synthetic|acceptance/i.test(name)) return 'CareerCase Presentation Partner';
  return authoritativeName;
}

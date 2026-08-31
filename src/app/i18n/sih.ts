import type { Language } from './index';

export const sihMessages = {
  en: {
    application: 'Application',
    exactSubmission: 'Exact immutable submission',
    applicationTimeline: 'Application timeline',
    evidenceRequest: 'Evidence request',
    interview: 'Interview',
    offer: 'Offer',
    outcome: 'Outcome',
    feedback: 'Feedback',
    recruiterInternal: 'Recruiter internal',
    withdrawApplication: 'Withdraw application',
    acceptOffer: 'Accept offer',
    declineOffer: 'Decline offer',
    retry: 'Retry',
    loading: 'Loading',
    empty: 'Nothing recorded yet.',
  },
  hi: {
    application: 'आवेदन', exactSubmission: 'सटीक अपरिवर्तनीय सबमिशन', applicationTimeline: 'आवेदन समयरेखा', evidenceRequest: 'प्रमाण अनुरोध', interview: 'साक्षात्कार', offer: 'प्रस्ताव', outcome: 'परिणाम', feedback: 'प्रतिक्रिया', recruiterInternal: 'भर्ती आंतरिक', withdrawApplication: 'आवेदन वापस लें', acceptOffer: 'प्रस्ताव स्वीकार करें', declineOffer: 'प्रस्ताव अस्वीकार करें', retry: 'फिर प्रयास करें', loading: 'लोड हो रहा है', empty: 'अभी कुछ दर्ज नहीं है।',
  },
  te: {
    application: 'దరఖాస్తు', exactSubmission: 'ఖచ్చితమైన మార్చలేని సమర్పణ', applicationTimeline: 'దరఖాస్తు కాలక్రమం', evidenceRequest: 'ఆధార అభ్యర్థన', interview: 'ఇంటర్వ్యూ', offer: 'ఆఫర్', outcome: 'ఫలితం', feedback: 'అభిప్రాయం', recruiterInternal: 'రిక్రూటర్ అంతర్గతం', withdrawApplication: 'దరఖాస్తును ఉపసంహరించండి', acceptOffer: 'ఆఫర్‌ను అంగీకరించండి', declineOffer: 'ఆఫర్‌ను తిరస్కరించండి', retry: 'మళ్లీ ప్రయత్నించండి', loading: 'లోడ్ అవుతోంది', empty: 'ఇంకా ఏదీ నమోదు కాలేదు.',
  },
} as const;

export type SihMessageKey = keyof typeof sihMessages.en;
export function sihMessage(lang: Language, key: SihMessageKey): string {
  return sihMessages[lang][key] ?? sihMessages.en[key];
}

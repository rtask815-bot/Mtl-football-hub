/**
 * Universal Google Football Intelligence & Gemini Scout Utility
 * Dispatches global custom events to open the embedded Google Search / Gemini frame
 * for any match, fixture, prediction, news article, or trending topic.
 */

export type GoogleScoutTab = 'gemini' | 'all' | 'scores' | 'news' | 'videos' | 'images';

export function openGoogleScout(query: string, tab: GoogleScoutTab = 'gemini') {
  if (typeof window === 'undefined') return;
  
  const cleanQuery = query ? query.trim() : 'Football Match Intelligence';
  
  window.dispatchEvent(
    new CustomEvent('open-quick-search', {
      detail: {
        query: cleanQuery,
        tab
      }
    })
  );
}

export default openGoogleScout;

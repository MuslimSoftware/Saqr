// Simple timestamp formatter using toLocaleString for better timezone handling
export const formatTimestamp = (isoString?: string): string | null => {
  if (!isoString) return null;
  
  const correctedIsoString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;

  try {
    // Parse the corrected string
    const date = new Date(correctedIsoString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate the difference in days
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day - show time
      return date.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week - show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (diffDays < 365) {
      // Within a year - show month and day
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // More than a year - show year as well
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return null;
  }
};
  
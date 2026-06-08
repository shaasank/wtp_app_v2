export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatLocalTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function minutesAfterTime(localTime: string, cutoffTime: string) {
  const toSeconds = (value: string) => {
    const raw = String(value ?? '').trim().toLowerCase();
    const meridiem = raw.match(/\b(am|pm)\b/)?.[1];
    const time = raw.replace(/\b(am|pm)\b/g, '').trim().replace(/\./g, ':');
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (time.includes(':')) {
      const [hourPart = '0', minutePart = '0', secondPart = '0'] = time.split(':');
      hours = Number(hourPart) || 0;
      minutes = Number(minutePart) || 0;
      seconds = Number(secondPart) || 0;
    } else {
      const digits = time.replace(/\D/g, '');
      if (digits.length > 2) {
        hours = Number(digits.slice(0, -2)) || 0;
        minutes = Number(digits.slice(-2)) || 0;
      } else {
        hours = Number(digits) || 0;
      }
    }

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return hours * 3600 + minutes * 60 + seconds;
  };

  return Math.max(0, Math.floor((toSeconds(localTime) - toSeconds(cutoffTime)) / 60));
}

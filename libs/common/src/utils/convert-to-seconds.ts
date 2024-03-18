export function convertToSecondsUtil(timeStr: string) {
  if (!isNaN(timeStr as any)) {
    return parseInt(timeStr);
  }
  let multiplier;
  switch (timeStr[timeStr.length - 1]) {
    case 's':
      multiplier = 1;
      break;
    case 'm':
      multiplier = 60;
      break;
    case 'h':
      multiplier = 3600;
      break;
    case 'd':
      multiplier = 3600 * 24;
      break;
    case 'w':
      multiplier = 3600 * 24 * 7;
      break;
    case 'M':
      multiplier = 3600 * 24 * 30;
      break;
    case 'y':
      multiplier = 3600 * 24 * 365;
      break;
    default:
      throw new Error('Invalid time string');
  }

  const num = parseInt(timeStr.slice(0, timeStr.length - 1));
  return num * multiplier;
}

// Utility functions for formatting numbers and text

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 */
export function formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 */
export function truncateText(text: string, maxLength: number = 20): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

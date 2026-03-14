export const CATEGORY_EMOJIS: Record<string, string> = {
    'Puntualidad': '⏰',
    'Proactividad': '🚀',
    'Compañerismo': '🤝',
    'Motivación': '🔥',
    'Caca': '💩',
    'Caca en pista': '💩',
    'Pis': '💦',
    'Pis en pista': '💦',
    'Asistencia a clase': '🎓',
    'Asistencia a entrenamiento': '🎓'
};

export function getEmojiForCategory(category: string, points?: number): string {
    if (!category) return '📌';

    if (CATEGORY_EMOJIS[category]) {
        return CATEGORY_EMOJIS[category];
    }

    const lowerCategory = category.toLowerCase();
    
    // First place
    if (lowerCategory.includes('primero en ')) {
        return '🥇';
    }
    // Second place
    if (lowerCategory.includes('segundo en ')) {
        return '🥈';
    }
    // Third place
    if (lowerCategory.includes('tercero en ')) {
        return '🥉';
    }
    
    // Generic competition or old legacy competition names
    if (lowerCategory.includes('competición')) {
        return '🏆';
    }

    // Default fallback for custom or unknown categories
    if (points !== undefined) {
         return points > 0 ? '⭐' : '⚠️';
    }
    
    return '📌';
}

import type { TaskData } from './dataService';

export const aiService = {
    // Existing Hint Logic
    getHint: (task: TaskData): string => {
        // Mock AI logic
        return `For this ${task.category} evaluation, first check the metadata. The query type is "${task.metadata.queryType}". 
    Look at the "${task.subCategory}" guidelines. 
    Since the result is "${task.result.title}" by "${task.result.developer}", verify if it matches the user intent for "${task.query}".
    Suggested rating might be based on relevance.`;
    },

    // NEW: Real OCR Logic
    analyzeImage: async (imageFile: File): Promise<Partial<TaskData>> => {
        try {
            console.log("Starting OCR analysis...");
            // @ts-expect-error - Tesseract is loaded via CDN globally
            const { Tesseract } = window;

            if (!Tesseract) {
                console.error("Tesseract not loaded");
                throw new Error("OCR library not ready. Please check internet connection.");
            }

            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'eng',
                { logger: (m: { status?: string; progress?: number }) => console.log(m) }
            );

            console.log("OCR Result:", text);
            const cleanText = text.trim();
            const lines = cleanText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

            // 1. Guess Query (usually at top or "Search" keyword)
            let query = lines.find((l: string) => l.toLowerCase().includes('search'))?.replace(/search/i, '').replace(/for/i, '').trim();
            if (!query) query = lines[0] || "Detected Query"; // Fallback to first line

            // 2. Guess Title (usually largest text or near top, excluding query)
            const title = lines.find((l: string) => l !== query && l.length > 3 && l.length < 50) || "Detected Title";

            // 3. Extract Ratings & Reviews (Regex)
            // Looking for patterns like "4.5", "1.2K Ratings", "500 Reviews"
            const ratingMatch = cleanText.match(/(\d\.\d)\s?★?|(\d\.\d)\s?stars?/i);
            const reviewMatch = cleanText.match(/(\d+(?:[.,]\d+)?[KkwM]?)\s?(?:ratings|reviews)/i);

            const rating = ratingMatch ? ratingMatch[1] || ratingMatch[2] : "N/A";
            const reviews = reviewMatch ? reviewMatch[1] : "N/A";

            // 4. Construct Links
            const googleLink = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const appStoreLink = `https://www.google.com/search?q=site:apps.apple.com+${encodeURIComponent(title)}`;

            // 5. Draft Comment
            let comment = `The user is searching for "${query}". The result "${title}" is relevant.`;
            if (rating !== "N/A" || reviews !== "N/A") {
                comment += ` It has ${rating} stars and ${reviews} ratings/reviews, indicating popularity. Since it satisfies the user intent, it is a perfect match.`;
            }

            const autoType = query.toLowerCase().includes('app') ? 'App Navigational' : 'Broad';

            return {
                query: query,
                metadata: {
                    queryType: autoType,
                    distribution: 'Mid',
                    spelling: 'Spelled Correctly',
                    language: 'English',
                    searchLinks: [{ name: 'Google', url: googleLink }]
                },
                result: {
                    title: title,
                    description: cleanText.substring(0, 250) + "...",
                    sourceName: 'View on App Store',
                    sourceLink: appStoreLink,
                    subtitle: `${rating} ★ • ${reviews} Ratings`
                },
                correctRating: 'Perfect',
                correctComment: comment
            };
        } catch (error) {
            console.error("OCR Failed:", error);
            // Fallback to filename guessing if OCR fails
            return {
                query: imageFile.name.split('.')[0].replace(/[-_]/g, ' '),
                result: {
                    title: "Unknown Result",
                    description: "OCR failed to read text."
                }
            };
        }
    }
};

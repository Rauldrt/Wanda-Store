export const getImageUrl = (url?: string): string => {
    if (!url) return "";
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    return url;
};

export const normalizeText = (text: any): string =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const smartSearch = (text: string, query: string): boolean => {
    if (!query) return true;
    const normText = normalizeText(text);
    const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
    return terms.every(t => normText.includes(t));
};

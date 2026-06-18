export const getImageUrl = (url?: string): string => {
    if (!url || typeof url !== 'string') return "";
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    return url;
};

export const normalizeText = (text: string | number | null | undefined): string =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


export const smartSearch = (text: string, query: string): boolean => {
    if (!query) return true;
    const normText = normalizeText(text);
    const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
    return terms.every(t => normText.includes(t));
};

export const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.75): Promise<{ file: File; base64: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                
                // Get compressed base64
                const base64 = canvas.toDataURL("image/jpeg", quality);
                
                // Convert to File
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas to Blob conversion failed"));
                        return;
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    resolve({ file: compressedFile, base64 });
                }, "image/jpeg", quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

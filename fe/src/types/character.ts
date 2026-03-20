export interface Character {
    id: string;
    name: string;
    avatar: string; // emoji or base64 data URL
    expressions?: Record<string, string>; // Dynamic emotions e.g. { bahagia: "file1", kecewa: "file2" }
    personality: string;
    promptStyle: string; // instruction for AI on how to roast
    color: string; // accent color for the card
    isDefault: boolean;
}

export const DEFAULT_CHARACTERS: Character[] = [];

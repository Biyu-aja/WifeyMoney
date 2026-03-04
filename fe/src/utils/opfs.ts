import type { Character } from '../types/character';
import { DEFAULT_CHARACTERS } from '../types/character';

const DIR_NAME = 'wifey-characters';
const META_FILE = 'characters.json';

async function getDir() {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(DIR_NAME, { create: true });
}

async function readMetaFile(): Promise<Character[]> {
    try {
        const dir = await getDir();
        const fileHandle = await dir.getFileHandle(META_FILE);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch {
        return [];
    }
}

async function writeMetaFile(characters: Character[]): Promise<void> {
    const dir = await getDir();
    const fileHandle = await dir.getFileHandle(META_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(characters));
    await writable.close();
}

export const characterStorage = {
    /**
     * Get all characters (defaults + custom from OPFS)
     */
    async getAll(): Promise<Character[]> {
        const custom = await readMetaFile();
        return [...DEFAULT_CHARACTERS, ...custom];
    },

    /**
     * Get only custom characters from OPFS
     */
    async getCustom(): Promise<Character[]> {
        return readMetaFile();
    },

    /**
     * Save a new custom character
     */
    async save(character: Character): Promise<void> {
        const custom = await readMetaFile();
        const idx = custom.findIndex(c => c.id === character.id);
        if (idx >= 0) {
            custom[idx] = character;
        } else {
            custom.push(character);
        }
        await writeMetaFile(custom);
    },

    /**
     * Save avatar image to OPFS, returns the stored file name
     */
    async saveAvatar(characterId: string, file: File): Promise<string> {
        const dir = await getDir();
        const avatarsDir = await dir.getDirectoryHandle('avatars', { create: true });

        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${characterId}.${ext}`;

        const fileHandle = await avatarsDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();

        return fileName;
    },

    /**
     * Load avatar image from OPFS as data URL
     */
    async loadAvatar(fileName: string): Promise<string | null> {
        try {
            const dir = await getDir();
            const avatarsDir = await dir.getDirectoryHandle('avatars');
            const fileHandle = await avatarsDir.getFileHandle(fileName);
            const file = await fileHandle.getFile();

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        } catch {
            return null;
        }
    },

    /**
     * Delete a custom character
     */
    async delete(characterId: string): Promise<void> {
        const custom = await readMetaFile();
        const filtered = custom.filter(c => c.id !== characterId);
        await writeMetaFile(filtered);

        // Try to delete avatar
        try {
            const dir = await getDir();
            const avatarsDir = await dir.getDirectoryHandle('avatars');
            // List files and find matching avatar
            for await (const [name] of (avatarsDir as any).entries()) {
                if (name.startsWith(characterId)) {
                    await avatarsDir.removeEntry(name);
                    break;
                }
            }
        } catch {
            // Avatar might not exist, that's fine
        }
    },

    /**
     * Get selected character ID from localStorage
     */
    getSelectedId(): string {
        return localStorage.getItem('wifey_selected_character') || 'gen-z';
    },

    /**
     * Save selected character ID to localStorage
     */
    setSelectedId(id: string): void {
        localStorage.setItem('wifey_selected_character', id);
    },
};

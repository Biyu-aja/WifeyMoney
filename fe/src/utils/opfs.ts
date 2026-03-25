import type { Character } from '../types/character';
import { DEFAULT_CHARACTERS } from '../types/character';
import type { Wallet } from '../types';

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
    async saveAvatar(characterId: string, file: File, suffix: string = ''): Promise<string> {
        const dir = await getDir();
        const avatarsDir = await dir.getDirectoryHandle('avatars', { create: true });

        const ext = file.name.split('.').pop() || 'png';
        const fileName = suffix ? `${characterId}_${suffix}.${ext}` : `${characterId}.${ext}`;

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

    /**
     * Clear all custom characters and avatars
     */
    async clearAll(): Promise<void> {
        await writeMetaFile([]);
        try {
            const dir = await getDir();
            await dir.removeEntry('avatars', { recursive: true });
        } catch {
            // Ignore if directory doesn't exist
        }
        localStorage.removeItem('wifey_selected_character');
    },
};

const WALLET_DIR_NAME = 'wifey-wallets';
const WALLET_META_FILE = 'wallets.json';

const DEFAULT_WALLET: Wallet = {
    id: 'main',
    name: 'Dompet Utama',
    icon: '💰',
    isMain: true
};

async function getWalletDir() {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(WALLET_DIR_NAME, { create: true });
}

async function readWalletsFile(): Promise<Wallet[]> {
    try {
        const dir = await getWalletDir();
        const fileHandle = await dir.getFileHandle(WALLET_META_FILE);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch {
        return [DEFAULT_WALLET];
    }
}

async function writeWalletsFile(wallets: Wallet[]): Promise<void> {
    const dir = await getWalletDir();
    const fileHandle = await dir.getFileHandle(WALLET_META_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(wallets));
    await writable.close();
}

export const walletStorage = {
    async getAll(): Promise<Wallet[]> {
        return readWalletsFile();
    },
    async save(wallet: Wallet): Promise<void> {
        const wallets = await readWalletsFile();
        const idx = wallets.findIndex(w => w.id === wallet.id);
        if (idx >= 0) {
            wallets[idx] = wallet;
        } else {
            wallets.push(wallet);
        }
        await writeWalletsFile(wallets);
    },
    async delete(walletId: string): Promise<void> {
        const wallets = await readWalletsFile();
        if (wallets.length <= 1) throw new Error("Cannot delete last wallet");
        const filtered = wallets.filter(w => w.id !== walletId);
        await writeWalletsFile(filtered);
    }
};

const DREAM_DIR_NAME = 'wifey-dreams';
const DREAM_META_FILE = 'dreams.json';

import type { DreamItem } from '../types';

async function getDreamDir() {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(DREAM_DIR_NAME, { create: true });
}

async function readDreamsFile(): Promise<DreamItem[]> {
    try {
        const dir = await getDreamDir();
        const fileHandle = await dir.getFileHandle(DREAM_META_FILE);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch {
        return [];
    }
}

async function writeDreamsFile(dreams: DreamItem[]): Promise<void> {
    const dir = await getDreamDir();
    const fileHandle = await dir.getFileHandle(DREAM_META_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(dreams));
    await writable.close();
}

export const dreamItemStorage = {
    async getAll(): Promise<DreamItem[]> {
        return readDreamsFile();
    },
    async getById(id: string): Promise<DreamItem | null> {
        const items = await readDreamsFile();
        return items.find(i => i.id === id) || null;
    },
    async save(item: DreamItem, imageFile?: File): Promise<void> {
        if (imageFile) {
            const fileName = await this.saveImage(item.id, imageFile);
            item.image = fileName;
        }
        const items = await readDreamsFile();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            items[idx] = { ...items[idx], ...item };
        } else {
            items.push(item);
        }
        await writeDreamsFile(items);
    },
    async delete(itemId: string): Promise<void> {
        const items = await readDreamsFile();
        const filtered = items.filter(i => i.id !== itemId);
        await writeDreamsFile(filtered);
    },
    async saveImage(itemId: string, file: File): Promise<string> {
        const dir = await getDreamDir();
        const imagesDir = await dir.getDirectoryHandle('images', { create: true });
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${itemId}.${ext}`;
        const fileHandle = await imagesDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        return fileName;
    },
    async loadImage(fileName: string): Promise<string | null> {
        try {
            const dir = await getDreamDir();
            const imagesDir = await dir.getDirectoryHandle('images');
            const fileHandle = await imagesDir.getFileHandle(fileName);
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
    }
};


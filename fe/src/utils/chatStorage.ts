export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
}

const DIR_NAME = 'wifey-chats';
const META_FILE = 'sessions.json';

async function getDir() {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(DIR_NAME, { create: true });
}

export const chatStorage = {
    async getAllSessions(): Promise<ChatSession[]> {
        try {
            const dir = await getDir();
            const fileHandle = await dir.getFileHandle(META_FILE);
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text) || [];
        } catch {
            return [];
        }
    },

    async saveSessions(sessions: ChatSession[]): Promise<void> {
        const dir = await getDir();
        const fileHandle = await dir.getFileHandle(META_FILE, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(sessions));
        await writable.close();
    },

    async getSession(id: string): Promise<ChatSession | undefined> {
        const sessions = await this.getAllSessions();
        return sessions.find(s => s.id === id);
    },

    async saveSession(session: ChatSession): Promise<void> {
        const sessions = await this.getAllSessions();
        const idx = sessions.findIndex(s => s.id === session.id);
        if (idx >= 0) {
            sessions[idx] = session;
        } else {
            sessions.push(session);
        }

        // Sort by updatedAt descending
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        await this.saveSessions(sessions);
    },

    async deleteSession(id: string): Promise<void> {
        const sessions = await this.getAllSessions();
        const filtered = sessions.filter(s => s.id !== id);
        await this.saveSessions(filtered);
    },

    async clearAll(): Promise<void> {
        await this.saveSessions([]);
    }
};

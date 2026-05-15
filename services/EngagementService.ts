import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@kaszuby24_engagement_v1';

// Show the support prompt every N article reads.
const TRIGGER_EVERY = 5;
// After "Może później", skip the next N reads before asking again.
const COOLDOWN_READS = 5;

interface EngagementData {
    totalReads: number;
    lastPromptAt: number;   // totalReads value when prompt was last shown
    snoozedUntil: number;   // totalReads value until which prompt is snoozed
}

const defaults: EngagementData = { totalReads: 0, lastPromptAt: 0, snoozedUntil: 0 };

async function load(): Promise<EngagementData> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
        return defaults;
    }
}

async function save(data: EngagementData): Promise<void> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
}

export const EngagementService = {
    // Call once per article view. Returns true when the support prompt should appear.
    async trackArticleRead(): Promise<boolean> {
        const data = await load();
        data.totalReads += 1;
        await save(data);

        if (data.totalReads <= data.snoozedUntil) return false;

        const readsSinceLastPrompt = data.totalReads - data.lastPromptAt;
        return readsSinceLastPrompt >= TRIGGER_EVERY;
    },

    // User clicked "Postaw kawę" or dismissed with intent to act — reset cycle.
    async markSupported(): Promise<void> {
        const data = await load();
        data.lastPromptAt = data.totalReads;
        data.snoozedUntil = 0;
        await save(data);
    },

    // User clicked "Może później" — snooze for COOLDOWN_READS more reads.
    async snooze(): Promise<void> {
        const data = await load();
        data.lastPromptAt = data.totalReads;
        data.snoozedUntil = data.totalReads + COOLDOWN_READS;
        await save(data);
    },
};

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "bot-data.json");

export interface LockedName {
  userId: string;
  nickname: string;
  lockedAt: number;
}

export interface DailyModeration {
  userId: string;
  date: string;
  bans: number;
  kicks: number;
}

export interface TicketRecord {
  channelId: string | null;
  userId: string;
  createdAt: number;
  closed: boolean;
  status: "pending" | "accepted" | "rejected";
  requestChannelId: string | null;
  requestMessageId: string | null;
  requestId: string | null;
  acceptedBy: string | null;
}

export interface BotData {
  lockedNames: LockedName[];
  dailyModeration: DailyModeration[];
  tickets: TicketRecord[];
  ticketCategoryId: string | null;
  ticketRequestChannelId: string | null;
}

const defaultData: BotData = {
  lockedNames: [],
  dailyModeration: [],
  tickets: [],
  ticketCategoryId: null,
  ticketRequestChannelId: null,
};

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadData(): BotData {
  ensureDataDir();
  if (!existsSync(DATA_FILE)) {
    saveData(defaultData);
    return { ...defaultData };
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BotData>;
    return {
      lockedNames: parsed.lockedNames ?? [],
      dailyModeration: parsed.dailyModeration ?? [],
      tickets: parsed.tickets ?? [],
      ticketCategoryId: parsed.ticketCategoryId ?? null,
      ticketRequestChannelId: parsed.ticketRequestChannelId ?? null,
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: BotData): void {
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getOrCreateDailyRecord(
  data: BotData,
  userId: string
): DailyModeration {
  const today = getTodayDate();
  let record = data.dailyModeration.find(
    (r) => r.userId === userId && r.date === today
  );
  if (!record) {
    record = { userId, date: today, bans: 0, kicks: 0 };
    data.dailyModeration.push(record);
  }
  data.dailyModeration = data.dailyModeration.filter(
    (r) => r.date === today || r.userId === userId
  );
  return record;
}

const MAX_DAILY_BANS = 4;
const MAX_DAILY_KICKS = 4;

export { MAX_DAILY_BANS, MAX_DAILY_KICKS };

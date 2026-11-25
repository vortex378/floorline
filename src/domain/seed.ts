import { UNITS } from "./catalog";
import { PENTHOUSE_FLOOR } from "./layouts";
import { listPrice, roundPrice } from "./pricing";
import { createRandom } from "./random";
import type {
  ContactMethod,
  Lead,
  LeadSource,
  LeadStage,
  Orientation,
  PriceChange,
  StatusEvent,
  UnitSpec,
  UnitState,
  UnitStatus,
} from "./types";

export const SCHEMA_VERSION = 3;
const DAY = 86_400_000;

export interface SandboxState {
  schema: number;
  seededAt: number;
  units: Record<string, UnitState>;
  history: StatusEvent[];
  priceChanges: PriceChange[];
  leads: Lead[];
}

const ORIENTATION_BONUS: Record<Orientation, number> = {
  S: 0.12,
  SE: 0.08,
  SW: 0.08,
  E: 0.03,
  W: 0.03,
  NE: 0,
  NW: 0,
  N: -0.06,
};

/** Fixed story beats so the demo always has something interesting to show. */
const FIXED_STATUS: Record<string, UnitStatus> = {
  "11-PH1": "reserved",
  "11-PH2": "available",
  "00-C1": "sold",
  "00-C2": "available",
  "00-C3": "unavailable",
};

/**
 * Deterministic statuses (no dates involved), so server-rendered pages and
 * the first client render always agree.
 */
export function seedStatuses(): Record<string, UnitStatus> {
  const rand = createRandom(20281);
  const out: Record<string, UnitStatus> = {};
  for (const u of UNITS) {
    const fixed = FIXED_STATUS[u.code];
    if (fixed) {
      out[u.code] = fixed;
      continue;
    }
    const pSold = Math.min(0.82, Math.max(0.05, 0.2 + 0.03 * u.floor + ORIENTATION_BONUS[u.orientation]));
    const roll = rand.next();
    out[u.code] = roll < pSold ? "sold" : roll < pSold + 0.15 ? "reserved" : "available";
  }
  return out;
}

export function seedUnitStates(updatedAt = 0): Record<string, UnitState> {
  const statuses = seedStatuses();
  return Object.fromEntries(
    UNITS.map((u) => [
      u.code,
      {
        status: statuses[u.code],
        price: listPrice(u),
        priceVisible: u.floor !== PENTHOUSE_FLOOR,
        version: 1,
        updatedAt,
      } satisfies UnitState,
    ]),
  );
}

const AGENTS = ["Elira Dervishi", "Ardit Kola"] as const;
export const MANAGER = "Sara Prifti";

const PEOPLE: ReadonlyArray<{ name: string; locale: "sq" | "en" | "it"; msg: string }> = [
  { name: "Erion Hoxha", locale: "sq", msg: "Jam i interesuar për një 2+1 në katet e larta. A ka mundësi pagese me këste?" },
  { name: "Anisa Gjoka", locale: "sq", msg: "Dua të vij ta shoh projektin këtë fundjavë." },
  { name: "Dritan Shehu", locale: "sq", msg: "Sa është kapari për rezervim?" },
  { name: "Klea Marku", locale: "sq", msg: "Kërkoj apartament me ballkon nga jugu." },
  { name: "Besnik Lleshi", locale: "sq", msg: "A përfshihet parkimi në çmim?" },
  { name: "Jonida Bregu", locale: "sq", msg: "Më interesojnë dy njësi 1+1 për investim." },
  { name: "Gentian Duka", locale: "sq", msg: "Kur pritet përfundimi i karabinasë?" },
  { name: "Ornela Hysa", locale: "sq", msg: "Dua informacion për penthouse-in." },
  { name: "Endri Çela", locale: "sq", msg: "A keni ambiente tregtare në dispozicion?" },
  { name: "Megi Kraja", locale: "sq", msg: "Na interesojnë katet 4–7, orientim lindje." },
  { name: "Alban Muça", locale: "sq", msg: "Kërkoj ofertë për pagesë cash." },
  { name: "Rudina Leka", locale: "sq", msg: "A mund të më dërgoni planimetrinë në PDF?" },
  { name: "Fatjon Gjika", locale: "sq", msg: "Jam emigrant në Itali, a mund të bëjmë takim online?" },
  { name: "Xhesika Rexha", locale: "sq", msg: "Sa kushtojnë shpenzimet e mirëmbajtjes?" },
  { name: "Arta Krasniqi", locale: "en", msg: "I'm based in London and visiting Tirana next month. Can we book a viewing?" },
  { name: "Ilir Vata", locale: "en", msg: "Looking for a 3+1 for my family, south facing if possible." },
  { name: "Daniel Novak", locale: "en", msg: "Interested in a rental investment. What yields are you seeing in the area?" },
  { name: "Emma Collins", locale: "en", msg: "Is the penthouse price negotiable?" },
  { name: "Jonas Weber", locale: "en", msg: "Do you offer payment plans for foreign buyers?" },
  { name: "Lena Hartmann", locale: "en", msg: "Could you share the technical specifications for the windows and insulation?" },
  { name: "Felix Braun", locale: "en", msg: "Is there a gym or pool in the building?" },
  { name: "Marco Bellini", locale: "it", msg: "Vorrei informazioni su un bilocale ai piani alti." },
  { name: "Giulia Ferri", locale: "it", msg: "È possibile acquistare tramite procura dall'Italia?" },
  { name: "Luca Moretti", locale: "it", msg: "Mi interessa un trilocale con terrazzo." },
  { name: "Sara Conti", locale: "it", msg: "Quando sarà consegnato l'edificio?" },
  { name: "Paolo Greco", locale: "it", msg: "Avete locali commerciali al piano terra?" },
  { name: "Blerta Kodra", locale: "sq", msg: "A ka mundësi të blej me kredi bankare?" },
  { name: "Arlind Zeqiri", locale: "sq", msg: "Më intereson një 3+1 me dy banjo." },
  { name: "Eneida Pasha", locale: "sq", msg: "Kur mund ta vizitoj zyrën e shitjeve?" },
  { name: "Kristian Doko", locale: "sq", msg: "Dua një apartament në katet 8–10." },
  { name: "Silvana Tafa", locale: "sq", msg: "Sa është çmimi për m² në katin e 5?" },
  { name: "Redon Gashi", locale: "sq", msg: "Jam në Gjermani, a mund të flasim në WhatsApp?" },
  { name: "Elona Qosja", locale: "sq", msg: "A ka depo për çdo apartament?" },
  { name: "Mirela Nikolla", locale: "sq", msg: "Më dërgoni ju lutem planin e pagesave." },
  { name: "Tomas Lindqvist", locale: "en", msg: "Interested in a south-facing 2+1 as a holiday home." },
  { name: "Hannah Price", locale: "en", msg: "What is included in the handover — kitchen, wardrobes?" },
  { name: "Omar Haddad", locale: "en", msg: "Can I reserve remotely and sign later in person?" },
  { name: "Sofia Marin", locale: "en", msg: "Do you have any 1+1 units left on high floors?" },
  { name: "Matthias Keller", locale: "en", msg: "Please send the energy certificate details." },
  { name: "Chiara Ricci", locale: "it", msg: "Vorrei prenotare una visita a dicembre." },
  { name: "Andrea Galli", locale: "it", msg: "Il prezzo include il posto auto?" },
  { name: "Federica Rossi", locale: "it", msg: "Mi interessa l'attico, è ancora disponibile?" },
  { name: "Davide Marino", locale: "it", msg: "Quali sono le spese condominiali previste?" },
  { name: "Elisa Fontana", locale: "it", msg: "Possiamo fare una videochiamata per vedere i piani?" },
];

const NOTE_BODIES = [
  "Called — wants to visit on Saturday.",
  "Sent floor plan and payment plan by WhatsApp.",
  "Prefers higher floors, budget around €180k.",
  "Asked about bank financing; referred to partner bank.",
  "Visited the site office, very interested.",
  "Waiting for spouse's decision.",
];

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".");

function seedHistoryAndLeads(
  units: Record<string, UnitState>,
  now: number,
): Pick<SandboxState, "history" | "priceChanges" | "leads"> {
  const rand = createRandom(7);
  const history: StatusEvent[] = [];
  const leads: Lead[] = [];
  let ev = 0;
  let leadSeq = 0;

  const makeLead = (
    stage: LeadStage,
    createdAt: number,
    unitCodes: string[],
    source: LeadSource,
  ): Lead => {
    const person = PEOPLE[leadSeq % PEOPLE.length];
    leadSeq += 1;
    const method: ContactMethod = rand.pick(["whatsapp", "whatsapp", "phone", "email"] as const);
    const noteCount = stage === "new" ? 0 : rand.int(0, 2);
    return {
      id: `lead_${String(leadSeq).padStart(3, "0")}`,
      createdAt,
      name: person.name,
      phone: `+355 69 555 ${String(1000 + leadSeq * 37).slice(-4)}`,
      email: `${slug(person.name)}@example.com`,
      locale: person.locale,
      message: person.msg,
      source,
      preferredContact: method,
      stage,
      assignedTo: stage === "new" ? null : rand.pick(AGENTS),
      unitCodes,
      notes: Array.from({ length: noteCount }, (_, i) => ({
        id: `note_${leadSeq}_${i}`,
        author: rand.pick(AGENTS),
        body: rand.pick(NOTE_BODIES),
        createdAt: createdAt + (i + 1) * DAY * rand.int(1, 3),
      })),
    };
  };

  // Sold + reserved units get a believable trail of events and a linked lead.
  const codes = Object.keys(units).sort();
  for (const code of codes) {
    const status = units[code].status;
    if (status === "sold") {
      const soldAt = now - rand.int(5, 420) * DAY;
      const reservedAt = soldAt - rand.int(7, 35) * DAY;
      const agent = rand.pick(AGENTS);
      const lead = makeLead("won", reservedAt - rand.int(3, 20) * DAY, [code], rand.pick(["unit_page", "picker", "contact"] as const));
      leads.push(lead);
      history.push(
        { id: `ev_${++ev}`, code, from: "available", to: "reserved", actor: agent, leadId: lead.id, note: "Deposit received", at: reservedAt },
        { id: `ev_${++ev}`, code, from: "reserved", to: "sold", actor: MANAGER, leadId: lead.id, note: "Contract signed", at: soldAt },
      );
    } else if (status === "reserved") {
      const reservedAt = now - rand.int(1, 28) * DAY;
      const lead = makeLead("reserved", reservedAt - rand.int(2, 14) * DAY, [code], rand.pick(["unit_page", "picker"] as const));
      leads.push(lead);
      history.push({ id: `ev_${++ev}`, code, from: "available", to: "reserved", actor: rand.pick(AGENTS), leadId: lead.id, note: "Reservation deposit", at: reservedAt });
    } else if (status === "unavailable") {
      history.push({ id: `ev_${++ev}`, code, from: "available", to: "unavailable", actor: MANAGER, leadId: null, note: "Used as site sales office", at: now - 200 * DAY });
    }
  }

  // Open pipeline: recent leads still being worked.
  const available = codes.filter((c) => units[c].status === "available");
  const openStages: LeadStage[] = ["new", "new", "new", "contacted", "contacted", "viewing", "viewing", "lost"];
  for (let i = 0; i < 18; i++) {
    const stage = openStages[i % openStages.length];
    const unitCount = rand.int(1, 2);
    const linked = Array.from({ length: unitCount }, () => rand.pick(available));
    leads.push(makeLead(stage, now - rand.int(0, 45) * DAY - rand.int(0, 20) * 3_600_000, [...new Set(linked)], rand.pick(["unit_page", "picker", "contact", "compare"] as const)));
  }

  // One historical bulk price change on the upper floors.
  const priceChanges: PriceChange[] = [];
  const bulkAt = now - 95 * DAY;
  let pc = 0;
  for (const code of codes) {
    const floor = Number(code.slice(0, 2));
    if (floor >= 6 && floor <= 10) {
      const newPrice = units[code].price;
      const oldPrice = roundPrice(newPrice / 1.025);
      priceChanges.push({ id: `pc_${++pc}`, code, oldPrice, newPrice, actor: MANAGER, reason: "Phase 2 pricing: +2.5% on floors 6–10", at: bulkAt });
    }
  }

  history.sort((a, b) => b.at - a.at);
  leads.sort((a, b) => b.createdAt - a.createdAt);
  priceChanges.sort((a, b) => b.at - a.at);
  return { history, priceChanges, leads };
}

export function createSeedState(now: number): SandboxState {
  const units = seedUnitStates(now);
  return {
    schema: SCHEMA_VERSION,
    seededAt: now,
    units,
    ...seedHistoryAndLeads(units, now),
  };
}

/** Units merged with their seed state — used for server rendering. */
export function seedUnits(): Array<UnitSpec & UnitState> {
  const states = seedUnitStates(0);
  return UNITS.map((u) => ({ ...u, ...states[u.code] }));
}


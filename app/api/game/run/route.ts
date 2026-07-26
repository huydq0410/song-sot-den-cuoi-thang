import { createClient } from "@supabase/supabase-js";
import {
  generateScenarioDeck,
  getProfilePromptLabel,
  isProfileId,
  scenarioFingerprintPayload,
  scenarioLogicFingerprintPayload,
  type GameEvent,
  type ProfileId,
  type ScenarioSource,
} from "../../../../lib/scenario-engine";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const PLAYER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RunRequest = {
  profileId?: unknown;
  playerId?: unknown;
};

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

type NarrativeDeck = {
  scenarios: Array<{
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    choices: Array<{
      label: string;
      hint: string;
      result: string;
    }>;
  }>;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function createSeed() {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function narrativeSchema() {
  const narrativeChoice = {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      hint: { type: "string" },
      result: { type: "string" },
    },
    required: ["label", "hint", "result"],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      scenarios: {
        type: "array",
        minItems: 30,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            eyebrow: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            choices: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: narrativeChoice,
            },
          },
          required: ["id", "eyebrow", "title", "description", "choices"],
        },
      },
    },
    required: ["scenarios"],
  };
}

function extractOutputText(response: OpenAIResponse) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return null;
}

function applyNarratives(
  baseScenarios: GameEvent[],
  narrativeDeck: NarrativeDeck,
) {
  if (narrativeDeck.scenarios.length !== baseScenarios.length) return null;

  const narratives = new Map(
    narrativeDeck.scenarios.map((scenario) => [scenario.id, scenario]),
  );

  const enriched = baseScenarios.map((scenario) => {
    const narrative = narratives.get(scenario.id);
    if (!narrative || narrative.choices.length !== scenario.choices.length) {
      return null;
    }

    return {
      ...scenario,
      eyebrow: narrative.eyebrow.slice(0, 50),
      title: narrative.title.slice(0, 120),
      description: narrative.description.slice(0, 360),
      choices: scenario.choices.map((choice, index) => ({
        ...choice,
        label: narrative.choices[index].label.slice(0, 100),
        hint: narrative.choices[index].hint.slice(0, 150),
        result: narrative.choices[index].result.slice(0, 320),
      })),
    };
  });

  return enriched.every(Boolean) ? (enriched as GameEvent[]) : null;
}

async function enrichWithAI(
  profileId: ProfileId,
  baseScenarios: GameEvent[],
): Promise<GameEvent[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const compactDeck = baseScenarios.map((scenario) => ({
    id: scenario.id,
    eyebrow: scenario.eyebrow,
    title: scenario.title,
    description: scenario.description,
    choices: scenario.choices.map(({ label, hint, result }) => ({
      label,
      hint,
      result,
    })),
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SCENARIO_MODEL ?? "gpt-5.6",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 12_000,
        input: [
          {
            role: "developer",
            content:
              "Bạn là biên tập viên cho mini game quản lý tài chính tại Việt Nam. Chỉ viết lại lời kể cho tự nhiên, ngắn gọn, có cá tính và đúng tiếng Việt. Không thay đổi id, số lượng tình huống, thứ tự lựa chọn, số tiền, thời điểm, nguyên nhân hoặc logic tài chính đã nêu. Không thêm chi tiết định lượng mới. Mỗi tình huống phải dễ hiểu trong một lần đọc và không được lặp cách mở đầu.",
          },
          {
            role: "user",
            content: `Hãy cá nhân hóa bộ tình huống sau cho một ${getProfilePromptLabel(profileId)}. Trả về đúng 30 tình huống theo schema:\n${JSON.stringify(compactDeck)}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "financial_game_narratives",
            strict: true,
            schema: narrativeSchema(),
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as OpenAIResponse;
    const outputText = extractOutputText(payload);
    if (!outputText) return null;

    return applyNarratives(
      baseScenarios,
      JSON.parse(outputText) as NarrativeDeck,
    );
  } catch {
    return null;
  }
}

async function reserveRun({
  playerId,
  profileId,
  seed,
  fingerprint,
  scenarioFingerprints,
  scenarios,
  source,
}: {
  playerId: string;
  profileId: ProfileId;
  seed: string;
  fingerprint: string;
  scenarioFingerprints: string[];
  scenarios: GameEvent[];
  source: ScenarioSource;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { id: crypto.randomUUID(), persisted: false };

  const { data, error } = await supabase.rpc("reserve_game_run", {
    p_player_id: playerId,
    p_profile_id: profileId,
    p_seed: seed,
    p_fingerprint: fingerprint,
    p_scenario_fingerprints: scenarioFingerprints,
    p_scenarios: scenarios,
    p_source: source,
  });

  if (error) {
    const duplicate =
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate");
    if (duplicate) return null;
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const id =
    row && typeof row === "object" && "id" in row && typeof row.id === "string"
      ? row.id
      : crypto.randomUUID();

  return { id, persisted: true };
}

export async function POST(request: Request) {
  let body: RunRequest;
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return json({ error: "Dữ liệu gửi lên không hợp lệ." }, 400);
  }

  if (!isProfileId(body.profileId)) {
    return json({ error: "Nhân vật không hợp lệ." }, 400);
  }

  const playerId =
    typeof body.playerId === "string" && PLAYER_ID_PATTERN.test(body.playerId)
      ? body.playerId
      : crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const seed = createSeed();
    const baseScenarios = generateScenarioDeck(body.profileId, seed);
    const fingerprint = await sha256(
      scenarioFingerprintPayload(body.profileId, baseScenarios),
    );
    const scenarioFingerprints = await Promise.all(
      baseScenarios.map((scenario) =>
        sha256(scenarioLogicFingerprintPayload(scenario)),
      ),
    );
    const aiScenarios = await enrichWithAI(body.profileId, baseScenarios);
    const scenarios = aiScenarios ?? baseScenarios;
    const source: ScenarioSource = aiScenarios ? "ai" : "rules";

    try {
      const reservation = await reserveRun({
        playerId,
        profileId: body.profileId,
        seed,
        fingerprint,
        scenarioFingerprints,
        scenarios,
        source,
      });
      if (!reservation) continue;

      return json({
        runId: reservation.id,
        playerId,
        seed,
        fingerprint,
        scenarios,
        source,
        persisted: reservation.persisted,
      });
    } catch {
      return json(
        {
          error:
            "Chưa thể xác nhận lượt chơi với kho dữ liệu. Vui lòng thử lại.",
        },
        503,
      );
    }
  }

  return json(
    { error: "Hệ thống vừa gặp một lượt trùng hiếm gặp. Vui lòng thử lại." },
    409,
  );
}

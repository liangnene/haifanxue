import { supabase } from "./supabase";

export type EventName =
  | "chat.message_sent"
  | "translate.doc_uploaded"
  | "cards.deck_generated"
  | "feature.opened";

export type ApiRoute = "/api/chat" | "/api/parse-file" | "/api/ocr-image";

export type ApiCallMeta = {
  status: number;
  durationMs: number;
  model?: "DeepSeek" | "OpenAI";
  tokens?: number;
  errorType?: string;
};

export async function trackEvent(
  name: EventName,
  props?: Record<string, unknown>
) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id ?? null;
  await supabase.from("events").insert({ name, props: props ?? null, user_id: userId });
}

export async function trackApiCall(route: ApiRoute, meta: ApiCallMeta) {
  await trackEvent("feature.opened", { route, ...meta });
}

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GAME_LABELS: Record<string, string> = {
  "connect-four": "Connect Four",
  "tic-tac-toe": "Tic Tac Toe",
  checkers: "Checkers",
  battleship: "Battleship",
  "mini-golf": "Mini Golf",
  monopoly: "Monopoly",
  jenga: "Jenga",
  "snakes-and-ladders": "Snakes & Ladders",
  "word-search": "Word Search",
  memory: "Memory",
  jeopardy: "Jeopardy",
  pool: "Pool",
  reaction: "Reaction",
  sudoku: "Sudoku",
  whiteboard: "Whiteboard",
  wordle: "Wordle",
  "math-trivia": "Math Trivia",
  "cup-pong": "Cup Pong",
};

interface TurnPayload {
  player_name: string;
  opponent_name: string;
  game_type: string;
  game_id: string;
  updated_at: string;
  whiteboard_action?: string;
  whiteboard_preview?: string;
  notification_type?: "turn" | "game_won" | "game_lost" | "game_draw";
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify the request comes from our service
  const authHeader = req.headers.get("Authorization");
  const expectedKeys = [
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("FUNCTION_SECRET"),
  ].filter(Boolean);
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !expectedKeys.includes(token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload: TurnPayload = await req.json();
  const { player_name, opponent_name, game_type, game_id, updated_at, whiteboard_action, whiteboard_preview, notification_type } =
    payload;

  if (!player_name || !game_type || !game_id) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Initialize Supabase client to look up chat_id
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Look up the player's Telegram chat_id
  const { data: chatRow, error } = await supabase
    .from("telegram_chat_ids")
    .select("chat_id, enabled")
    .eq("player_name", player_name)
    .single();

  if (error || !chatRow) {
    console.log(
      `No Telegram chat_id found for player: ${player_name}`,
      error?.message,
    );
    return new Response("No chat_id registered", { status: 200 });
  }

  if (!chatRow.enabled) {
    console.log(`Notifications disabled for player: ${player_name}`);
    return new Response("Notifications disabled", { status: 200 });
  }

  // Format the message
  const appUrl = Deno.env.get("APP_URL") || "https://online-games-alpha.vercel.app";
  const gameLabel = GAME_LABELS[game_type] || game_type;
  const timestamp = new Date(updated_at).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let message: string;
  if (game_type === "whiteboard") {
    const playLink = `${appUrl}/whiteboard`;
    const actionLabel = whiteboard_action === "created" ? "added a note to" :
      whiteboard_action === "deleted" ? "removed a note from" : "updated a note on";
    const previewLine = whiteboard_preview ? `\n*Note:* ${whiteboard_preview}` : "";
    message =
      `📝 *Whiteboard activity*\n\n` +
      `*${opponent_name}* ${actionLabel} the whiteboard${previewLine}\n` +
      `*Time:* ${timestamp}\n\n` +
      `[View whiteboard](${playLink})`;
  } else if (notification_type === "game_won") {
    const playLink = `${appUrl}/${game_type}/${game_id}`;
    message =
      `🏆 *You won!*\n\n` +
      `*Game:* ${gameLabel}\n` +
      `*Opponent:* ${opponent_name}\n` +
      `*Time:* ${timestamp}\n\n` +
      `[View game](${playLink})`;
  } else if (notification_type === "game_lost") {
    const playLink = `${appUrl}/${game_type}/${game_id}`;
    message =
      `😢 *You lost*\n\n` +
      `*Game:* ${gameLabel}\n` +
      `*Opponent:* ${opponent_name}\n` +
      `*Time:* ${timestamp}\n\n` +
      `[View game](${playLink})`;
  } else if (notification_type === "game_draw") {
    const playLink = `${appUrl}/${game_type}/${game_id}`;
    message =
      `🤝 *It's a draw!*\n\n` +
      `*Game:* ${gameLabel}\n` +
      `*Opponent:* ${opponent_name}\n` +
      `*Time:* ${timestamp}\n\n` +
      `[View game](${playLink})`;
  } else {
    const playLink = `${appUrl}/${game_type}/${game_id}`;
    message =
      `🎲 *Your turn!*\n\n` +
      `*Game:* ${gameLabel}\n` +
      `*Opponent:* ${opponent_name}\n` +
      `*Time:* ${timestamp}\n\n` +
      `[Play now](${playLink})`;
  }

  // Send via Telegram Bot API
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return new Response("Bot token not configured", { status: 500 });
  }

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const telegramResponse = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatRow.chat_id,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  const telegramResult = await telegramResponse.json();

  if (!telegramResponse.ok) {
    console.error("Telegram API error:", JSON.stringify(telegramResult));
    return new Response("Telegram send failed", { status: 502 });
  }

  console.log(
    `Notified ${player_name} (chat_id: ${chatRow.chat_id}) for ${gameLabel} game ${game_id}`,
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message, type MessageContent } from "./_core/llm";
import { storagePut } from "./storage";

async function uploadBase64Image(dataUri: string): Promise<string> {
  const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 image");
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  const key = `scans/${Date.now()}.jpg`;
  const { url } = await storagePut(key, buffer, contentType);
  return url;
}

const scanRouter = router({
  extractSentences: publicProcedure
    .input(z.object({ imageUri: z.string() }))
    .mutation(async ({ input }) => {
      let imageUrl = input.imageUri;

      if (input.imageUri.startsWith("data:")) {
        imageUrl = await uploadBase64Image(input.imageUri);
      }

      if (imageUrl.startsWith("/manus-storage/")) {
        const apiBase = (process.env.BUILT_IN_FORGE_API_URL || "").replace("/v1", "");
        imageUrl = `${apiBase}${imageUrl}`;
      }

      const messages: Message[] = [
        {
          role: "system",
          content: `You are an English text extractor for a children's English learning app.\nExtract ALL English sentences from the image in order and translate each to natural child-friendly Korean.\nGenerate a short title (3-6 words) summarizing the content.\nReturn ONLY valid JSON (no markdown):\n{"title":"...","sentences":[{"id":"1","en":"...","ko":"..."}]}\nIf no English text found: {"title":"텍스트 없음","sentences":[]}`,
        },
        {
          role: "user",
          content: [
            { type: "text" as const, text: "Extract all English sentences from this book page and translate to Korean." },
            { type: "image_url" as const, image_url: { url: imageUrl, detail: "high" as const } },
          ],
        },
      ];
      const response = await invokeLLM({
        messages,
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content ?? "{}";
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let parsed: { title?: string; sentences?: Array<{ id: string; en: string; ko: string }> };
      try { parsed = JSON.parse(content); } catch { parsed = { title: "새 학습", sentences: [] }; }

      return {
        title: parsed.title || "새 학습 세션",
        sentences: (parsed.sentences || []).map((s, i) => ({
          id: s.id || String(i + 1),
          en: s.en || "",
          ko: s.ko || "",
        })),
      };
    }),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  scan: scanRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const SITE = "https://fake-email.site";

type SkillEntry = {
  name: string;
  description: string;
  publicPath: string;
};

const SKILLS: SkillEntry[] = [
  {
    name: "temp-mailbox",
    description:
      "Create a disposable email inbox on fake-email.site for verification and signup flows.",
    publicPath: ".well-known/agent-skills/temp-mailbox/SKILL.md",
  },
  {
    name: "inbox-poll",
    description:
      "Poll a disposable mailbox on fake-email.site for newly received email messages.",
    publicPath: ".well-known/agent-skills/inbox-poll/SKILL.md",
  },
];

async function sha256OfPublicFile(relPath: string): Promise<string> {
  const abs = path.join(process.cwd(), "public", relPath);
  const buf = await readFile(abs);
  return createHash("sha256").update(buf).digest("hex");
}

export async function GET() {
  const skills = await Promise.all(
    SKILLS.map(async (s) => ({
      name: s.name,
      type: "skill",
      description: s.description,
      url: `${SITE}/${s.publicPath}`,
      sha256: await sha256OfPublicFile(s.publicPath),
    })),
  );

  const body = {
    $schema:
      "https://raw.githubusercontent.com/cloudflare/agent-skills-discovery-rfc/main/schemas/v0.2.0/index.schema.json",
    version: "0.2.0",
    updated: new Date().toISOString(),
    skills,
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

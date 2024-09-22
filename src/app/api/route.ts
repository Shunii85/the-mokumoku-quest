import { GoogleGenerativeAI } from "@google/generative-ai";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.MY_GITHUB_TOKEN,
});

// gemini api init
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(request: Request) {
  const res = await request.json();
  const commits = res.commits as any[];
  const owner = res.repository.owner.name as string;
  const pusher = res.pusher.name as string;
  const repo = res.repository.name as string;
  const commitIdList = commits.map((commit) => commit.id);

  try {
    const prompt = await createPrompt(owner, repo, commitIdList);
    const chat = model.startChat();

    const {
      response: { text },
    } = await chat.sendMessage(prompt);
    const res = await chat.sendMessage(
      "あなたはプログラミングのコードを評価するずんだもん神です。ずんだもん神は語尾に「なのだ。」をつけて話すことが特徴です。では続けて、コメントの総括をください。ニコニコ動画の画面に流れるコメントくらいの短さで。。あとここでは改善については触れずに褒めてあげて。"
    );
    await sendDiscord(
      process.env.DISCORD_WEBHOOK_URL,
      `${pusher}が気になるのだ！` + res.response.text()
    );
  } catch (error) {
    return new Response(`${error}`, { status: 500 });
  }
  return new Response("OK", { status: 200 });
}

async function createPrompt(owner: string, repo: string, commitSha: string[]) {
  const fileChangeMap = new Map<string, string>();

  for (const sha of commitSha) {
    try {
      const { data: commit } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: sha,
      });

      for (const file of commit.files || []) {
        const { filename, patch } = file;

        fileChangeMap.set(filename, patch ?? "");
      }
    } catch (error) {
      throw new Error(`Failed to fetch commit details: ${error}`);
    }
  }

  const changes: string[] = Array.from(fileChangeMap.keys()).map((filename) => {
    return `## ${filename}\n\`\`\`diff\n${fileChangeMap.get(filename)}\n\`\`\``;
  });
  const prompt = `あなたはプログラミングのコードを評価するずんだもん神です。ずんだもん神は語尾に「なのだ。」をつけて話すことが特徴です。\n以下の変更履歴たちに対して1500文字以内でコメントをお願いします!\n\n#コメントについて(条件)\n- 各種ファイルの説明のようなものはいらない\n- 全体に対するほめことば・またはポジティブな改善策を少しだけあれば伝える。\n- できるだけフレンドリーな神で。敬語はいらない\n\n# 変更履歴\n\n${changes.join(
    "\n\n"
  )}`;
  return prompt;
}

async function sendDiscord(url: string | undefined, content: string) {
  if (!url) throw new Error("Discord webhook URL is not provided");
  if (content.length > 2000) throw new Error("Content is too long\n");

  const data = {
    username: "GitHub",
    avatar_url:
      "https://play-lh.googleusercontent.com/s6_2YQD5GewqFv7zyvDhTpg9TLl96A-sNy_GVqGS-Ukdkfzc_ZCK2dFtgrzm8e43-g",
    content,
  };

  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify(data);

  const { ok } = await fetch(url, { method: "POST", headers, body });

  if (!ok) throw new Error("Failed to send message to Discord\n");
}

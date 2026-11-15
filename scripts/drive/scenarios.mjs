// Driver scenarios. Each: { proves: [routes from docs/FEATURES.md], run({ page, base, shot, expect }) }.
// Placeholder settings on 127.0.0.1: signed out, no data. Never press a button that signs in or sends.

const okPage = async (page, url, expect) => {
  const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
  expect(res && res.status() < 400, `${url} answered ${res?.status()}`);
};

export const SCENARIOS = {
  landing: { proves: ["/"], async run({ page, base, shot, expect }) { await okPage(page, `${base}/`, expect); await shot("landing"); } },
  login: { proves: ["/login"], async run({ page, base, shot, expect }) { await okPage(page, `${base}/login`, expect); await shot("login"); } },
  register: { proves: ["/register"], async run({ page, base, shot, expect }) { await okPage(page, `${base}/register`, expect); await shot("register"); } },
  explore: { proves: ["/explore"], async run({ page, base, shot, expect }) { await okPage(page, `${base}/explore`, expect); await shot("explore"); } },
  "protected-redirect": {
    proves: ["/home", "/admin", "/terms/[id]"],
    async run({ page, base, shot, expect }) {
      for (const p of ["/home", "/admin", "/terms/1"]) {
        await page.goto(`${base}${p}`, { waitUntil: "networkidle2" });
        expect(new URL(page.url()).pathname === "/login", `${p} did not send a signed-out visitor to /login (got ${page.url()})`);
      }
      await shot("redirected-to-login");
    },
  },
};

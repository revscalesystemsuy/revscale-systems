const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3210";

async function expectRedirect(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  if (![302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${path} expected redirect, received ${response.status}`);
  }
  const location = response.headers.get("location") || "";
  if (!location.includes("/auth/login")) {
    throw new Error(`${path} expected login redirect, received ${location}`);
  }
}

await expectRedirect("/protected/executive");
console.log("Executive smoke test passed");

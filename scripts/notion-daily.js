const { Client } = require("@notionhq/client");

/**
 * Required GitHub Secrets:
 *  - NOTION_TOKEN
 *  - NOTION_DAILY_DATABASE_ID
 *  - NOTION_DAILY_TEMPLATE_NAME
 */

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03",
});

const DAILY_DB_ID = process.env.NOTION_DAILY_DATABASE_ID;
const DAILY_TEMPLATE_NAME = process.env.NOTION_DAILY_TEMPLATE_NAME;

const TITLE_PROP_NAME = "이름"; // title
const DATE_PROP_NAME = "날짜";  // date

function summarizeEnv(name) {
  const raw = process.env[name];
  if (raw === undefined) {
    return { name, state: "undefined" };
  }

  if (raw.length === 0) {
    return { name, state: "empty string" };
  }

  if (raw.trim().length === 0) {
    return { name, state: "whitespace only", length: raw.length };
  }

  return { name, state: "set", length: raw.length };
}

function printSecretDiagnostics(requiredSecretNames) {
  const report = requiredSecretNames.map(summarizeEnv);

  console.error("[diagnostics] Required secret/env status:");
  for (const item of report) {
    const extra = item.length ? ` (length=${item.length})` : "";
    console.error(`  - ${item.name}: ${item.state}${extra}`);
  }

  // GitHub Actions context helps explain why secrets may be unavailable (e.g. PR from fork).
  const contextKeys = [
    "GITHUB_EVENT_NAME",
    "GITHUB_REF",
    "GITHUB_REPOSITORY",
    "GITHUB_ACTOR",
    "GITHUB_RUN_ID",
  ];
  console.error("[diagnostics] GitHub Actions context:");
  for (const key of contextKeys) {
    console.error(`  - ${key}: ${process.env[key] || "(not set)"}`);
  }
}

const REQUIRED_SECRETS = ["NOTION_TOKEN", "NOTION_DAILY_DATABASE_ID", "NOTION_DAILY_TEMPLATE_NAME"];
const missingSecrets = REQUIRED_SECRETS.filter((name) => {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0;
});

if (missingSecrets.length > 0) {
  console.error(`Missing required secrets: ${missingSecrets.join(", ")}`);
  printSecretDiagnostics(REQUIRED_SECRETS);
  console.error("[hint] Repository secrets are not provided to workflows triggered from forks or Dependabot.");
  process.exit(1);
}

// KST = UTC+9
const TIMEZONE_OFFSET_HOURS = 9;

function formatToday_KST_YYYY_MM_DD() {
  const now = new Date();
  const kst = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);

  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`; //
}

async function getDataSourceIdFromDatabase(databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = db.data_sources?.[0];
  if (!ds?.id) throw new Error("data_source_id not found for this database.");
  return ds.id;
}

async function findTemplateId(dataSourceId, templateName) {
  const res = await notion.dataSources.listTemplates({ data_source_id: dataSourceId });
  const tpl = res.templates?.find((t) => t.name === templateName);
  if (!tpl?.id) throw new Error(`Template not found: ${templateName}`);
  return tpl.id;
}

async function existsDailyByTitle(dataSourceId, title) {
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: TITLE_PROP_NAME,
      title: { equals: title },
    },
    page_size: 1,
  });
  return res.results.length > 0;
}

async function createDailyWithTemplate(dataSourceId, templateId, title, dateISO) {
  // 템플릿 적용 생성
  return notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    template: { type: "template_id", template_id: templateId },
    properties: {
      // 템플릿이 제목을 덮어쓸 수 있어서, 생성 후 update로 한 번 더 확정함
      [TITLE_PROP_NAME]: { title: [{ text: { content: title } }] },
      [DATE_PROP_NAME]: { date: { start: dateISO } },
    },
  });
}

async function forceUpdateTitle(pageId, title) {
  // 템플릿 적용 시 제목이 템플릿 이름으로 남는 경우가 있어 update로 확정
  return notion.pages.update({
    page_id: pageId,
    properties: {
      [TITLE_PROP_NAME]: { title: [{ text: { content: title } }] },
    },
  });
}

(async () => {
  const dateISO = formatToday_KST_YYYY_MM_DD();
  const title = dateISO; // ✅ 제목도 yyyy-mm-dd

  const dataSourceId = await getDataSourceIdFromDatabase(DAILY_DB_ID);

  // 중복 방지
  if (await existsDailyByTitle(dataSourceId, title)) {
    console.log("이미 존재:", title);
    return;
  }

  const templateId = await findTemplateId(dataSourceId, DAILY_TEMPLATE_NAME);

  const page = await createDailyWithTemplate(dataSourceId, templateId, title, dateISO);

  // 제목 확정(템플릿 덮어쓰기 방지)
  await forceUpdateTitle(page.id, title);

  console.log("Daily 생성 완료:", page.id, title);
})().catch((e) => {
  console.error(e.body || e);
  process.exit(1);
});

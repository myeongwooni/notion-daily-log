const { Client } = require("@notionhq/client");

/**
 * Creates a Notion database item each weekday at 08:00 KST.
 * Title format: YYYY.MM.DD
 *
 * Required env:
 *  - NOTION_TOKEN
 *  - NOTION_DATABASE_ID
 *  - TITLE_PROP_NAME (set to "제목")
 */

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const TITLE_PROP_NAME = process.env.TITLE_PROP_NAME; // "제목"

if (!DATABASE_ID || !TITLE_PROP_NAME || !process.env.NOTION_TOKEN) {
  console.error("Missing env. Please set NOTION_TOKEN, NOTION_DATABASE_ID, TITLE_PROP_NAME.");
  process.exit(1);
}

// GitHub Actions schedule is UTC; we generate title in KST.
const TIMEZONE_OFFSET_HOURS = 9; // KST = UTC+9

function formatTodayYYYYMMDD_KST() {
  const now = new Date();
  const kst = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);

  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
}

async function existsByTitle(title) {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: TITLE_PROP_NAME,
      title: { equals: title },
    },
    page_size: 1,
  });

  return res.results.length > 0;
}

async function createDailyPage(title) {
  return notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      [TITLE_PROP_NAME]: {
        title: [{ text: { content: title } }],
      },
      // If you have a Date property named "날짜", uncomment:
      // "날짜": { date: { start: title.replaceAll(".", "-") } },
    },
  });
}

(async () => {
  const title = formatTodayYYYYMMDD_KST();

  if (await existsByTitle(title)) {
    console.log("이미 존재:", title);
    return;
  }

  const page = await createDailyPage(title);
  console.log("생성 완료:", page.id, title);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

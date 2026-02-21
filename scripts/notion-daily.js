const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03",
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const TEMPLATE_NAME = process.env.NOTION_TEMPLATE_NAME;
const TITLE_PROP_NAME = "이름";

if (!DATABASE_ID || !TEMPLATE_NAME || !process.env.NOTION_TOKEN) {
  console.error("Missing required secrets.");
  process.exit(1);
}

const TIMEZONE_OFFSET_HOURS = 9;

function formatTodayYYYYMMDD_KST() {
  const now = new Date();
  const kst = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);

  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
}

async function getDataSourceIdFromDatabase(databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = db.data_sources?.[0];
  if (!ds?.id) throw new Error("data_source_id not found.");
  return ds.id;
}

async function findTemplateId(dataSourceId, templateName) {
  const res = await notion.dataSources.listTemplates({
    data_source_id: dataSourceId,
  });
  const tpl = res.templates?.find((t) => t.name === templateName);
  if (!tpl?.id) throw new Error(`Template not found: ${templateName}`);
  return tpl.id;
}

async function existsByTitle(databaseId, title) {
  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: TITLE_PROP_NAME,
      title: { equals: title },
    },
    page_size: 1,
  });
  return res.results.length > 0;
}

async function createPageWithTemplate(dataSourceId, templateId, title) {
  return notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: dataSourceId,
    },
    template: {
      type: "template_id",
      template_id: templateId,
    },
    properties: {
      [TITLE_PROP_NAME]: {
        title: [{ text: { content: title } }],
      },
      "날짜": {
        date: { start: title.replaceAll(".", "-") },
      },
    },
  });
}

(async () => {
  const title = formatTodayYYYYMMDD_KST();

  if (await existsByTitle(DATABASE_ID, title)) {
    console.log("Already exists:", title);
    return;
  }

  const dataSourceId = await getDataSourceIdFromDatabase(DATABASE_ID);
  const templateId = await findTemplateId(dataSourceId, TEMPLATE_NAME);

  const page = await createPageWithTemplate(dataSourceId, templateId, title);

  await notion.pages.update({
    page_id: page.id,
    properties: {
      [TITLE_PROP_NAME]: {
        title: [{ text: { content: title } }],
      },
    },
  });

  console.log("Created with template + title fixed:", page.id, title);

})().catch((e) => {
  console.error(e);
  process.exit(1);
});

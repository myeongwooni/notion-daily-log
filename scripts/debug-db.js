const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

(async () => {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });

  console.log("DB 제목:", db.title?.[0]?.plain_text);
  console.log("DB ID:", db.id);
  console.log("속성 목록:");
  for (const [key, value] of Object.entries(db.properties)) {
    console.log(`- ${key} (${value.type})`);
  }
})().catch((e) => {
  console.error("에러:", e.body || e);
  process.exit(1);
});
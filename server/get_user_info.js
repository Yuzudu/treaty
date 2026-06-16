const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.omkormjozkbqvrhxtrff:!Punchzudu26@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const usersRes = await client.query('SELECT * FROM users LIMIT 5;');
    console.log("Users:", JSON.stringify(usersRes.rows, null, 2));

    const projectsRes = await client.query('SELECT * FROM projects LIMIT 5;');
    console.log("Projects:", JSON.stringify(projectsRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

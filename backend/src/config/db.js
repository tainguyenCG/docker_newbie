const sql = require('mssql');

const dbConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'YourStrong@Passw0rd',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  database: process.env.MSSQL_DATABASE || 'LandingDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

const DB_NAME = dbConfig.database;

async function waitAndInitDb(retries = 20, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const masterPool = await new sql.ConnectionPool({ ...dbConfig, database: 'master' }).connect();
      await masterPool.request().query(
        `IF DB_ID(N'${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}]`
      );
      await masterPool.close();

      const pool = await new sql.ConnectionPool(dbConfig).connect();
      await createSchema(pool);
      console.log('[db] Database connected and schema ready');
      return pool;
    } catch (err) {
      console.error(`[db] Init attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function createSchema(pool) {
  await pool.request().query(`
    IF OBJECT_ID(N'Users', N'U') IS NULL
    CREATE TABLE Users (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      Username NVARCHAR(50) UNIQUE NOT NULL,
      PasswordHash NVARCHAR(200) NOT NULL,
      CreatedAt DATETIME DEFAULT GETDATE()
    );

    IF OBJECT_ID(N'SiteContent', N'U') IS NULL
    CREATE TABLE SiteContent (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      SectionKey NVARCHAR(50) UNIQUE NOT NULL,
      Title NVARCHAR(200) NULL,
      Subtitle NVARCHAR(500) NULL,
      Description NVARCHAR(MAX) NULL,
      SortOrder INT NOT NULL DEFAULT 0,
      UpdatedAt DATETIME DEFAULT GETDATE()
    );
  `);

  const userCount = await pool.request().query('SELECT COUNT(*) AS c FROM Users');
  if (userCount.recordset[0].c === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await pool
      .request()
      .input('username', sql.NVarChar, 'admin')
      .input('hash', sql.NVarChar, hash)
      .query('INSERT INTO Users (Username, PasswordHash) VALUES (@username, @hash)');
    console.log('[db] Seeded default admin user (admin / admin123)');
  }

  const contentCount = await pool.request().query('SELECT COUNT(*) AS c FROM SiteContent');
  if (contentCount.recordset[0].c === 0) {
    const seed = [
      ['hero', 'Chao mung den voi Landing Page', 'Giai phap Full-Stack: Astro + Node.js + MSSQL chay cung Docker', null, 1],
      ['about', 'Ve chung toi', null, 'Chung toi xay dung cac ung dung web hien dai, nhanh chong va dang tin cay. Du an nay la mau Landing Page co ban voi day du Frontend (Client & Admin) va Backend (API + SQL Server).', 2],
      ['feature_1', 'Hieu nang cao', null, 'Astro toi uu toc do tai trang, zero-JS mac dinh cho trang tinh.', 3],
      ['feature_2', 'De dang trien khai', null, 'Toan bo he thong chay bang mot lenh: docker compose up.', 4],
      ['feature_3', 'Quan tri noi dung', null, 'Admin panel cho phep chinh sua toan bo noi dung landing page.', 5],
      ['contact', 'Lien he', 'Email: contact@example.com | Dien thoai: 0123 456 789', null, 6],
    ];
    for (const [key, title, subtitle, description, order] of seed) {
      await pool
        .request()
        .input('key', sql.NVarChar, key)
        .input('title', sql.NVarChar, title)
        .input('subtitle', sql.NVarChar, subtitle)
        .input('description', sql.NVarChar(sql.MAX), description)
        .input('sortOrder', sql.Int, order)
        .query(
          `INSERT INTO SiteContent (SectionKey, Title, Subtitle, Description, SortOrder)
           VALUES (@key, @title, @subtitle, @description, @sortOrder)`
        );
    }
    console.log('[db] Seeded default landing content');
  }
}

module.exports = { sql, dbConfig, waitAndInitDb };

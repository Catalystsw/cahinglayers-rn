import { Post } from './model';
import { SqlDb } from './sql';
import { PostStore } from './store';

type Row = {
  id: string;
  author: string;
  caption: string;
  likeCount: number;
  likedByMe: number;
  accent: string;
  position: number;
};

const toPost = (row: Row): Post => ({
  id: row.id,
  author: row.author,
  caption: row.caption,
  likeCount: row.likeCount,
  likedByMe: row.likedByMe === 1,
  accent: row.accent,
});

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS post (
  id        TEXT    NOT NULL PRIMARY KEY,
  author    TEXT    NOT NULL,
  caption   TEXT    NOT NULL,
  likeCount INTEGER NOT NULL,
  likedByMe INTEGER NOT NULL,
  accent    TEXT    NOT NULL,
  position  INTEGER NOT NULL
);
`;

export class SqliteStore implements PostStore {
  constructor(private readonly db: SqlDb) {}

  static async open(db: SqlDb): Promise<SqliteStore> {
    await db.exec(SCHEMA);
    return new SqliteStore(db);
  }

  async getAll(): Promise<Post[]> {
    const rows = await this.db.all<Row>('SELECT * FROM post ORDER BY position ASC');
    return rows.map(toPost);
  }

  async replaceAll(items: Post[]): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM post');
      for (let i = 0; i < items.length; i++) {
        await this.insert(items[i], i);
      }
    });
  }

  async update(id: string, transform: (post: Post) => Post): Promise<void> {
    await this.db.transaction(async () => {
      const rows = await this.db.all<Row>('SELECT * FROM post WHERE id = ?', [id]);
      if (rows.length === 0) return;
      await this.insert(transform(toPost(rows[0])), rows[0].position);
    });
  }

  private insert(post: Post, position: number): Promise<void> {
    return this.db.run(
      `INSERT OR REPLACE INTO post (id, author, caption, likeCount, likedByMe, accent, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [post.id, post.author, post.caption, post.likeCount, post.likedByMe ? 1 : 0, post.accent, position],
    );
  }
}

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export class DatabaseService {
  private sql: SqlJsStatic | null = null;

  private async getSql(): Promise<SqlJsStatic> {
    if (!this.sql) {
      this.sql = await initSqlJs();
    }
    return this.sql;
  }

  /**
   * Carga una base de datos SQLite desde un buffer
   */
  async loadDatabase(buffer: Uint8Array): Promise<Database> {
    const SQL = await this.getSql();
    return new SQL.Database(buffer);
  }

  /**
   * Ejecuta una consulta y devuelve los resultados de forma amigable
   */
  executeQuery(db: Database, query: string): any[] {
    const results = db.exec(query);
    if (results.length === 0) return [];

    const columns = results[0].columns;
    return results[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}

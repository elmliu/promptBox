"""
将数据库中所有 UTC 时间 +8 小时，转换为北京时间。
仅需运行一次。运行前建议备份 prompts.db。

用法: python migrate_timezone.py
"""

import sqlite3

DB_PATH = 'prompts.db'
OFFSET_HOURS = 8

# 所有需要迁移的 (表名, 时间列名) 列表
COLUMNS_TO_MIGRATE = [
    ('projects', 'created_at'),
    ('projects', 'updated_at'),
    ('prompts', 'created_at'),
    ('prompts', 'updated_at'),
    ('prompt_versions', 'created_at'),
    ('users', 'created_at'),
    ('groups', 'created_at'),
    ('user_groups', 'created_at'),
    ('project_permissions', 'created_at'),
    ('api_keys', 'created_at'),
    ('api_keys', 'last_used_at'),
]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for table, column in COLUMNS_TO_MIGRATE:
        sql = f"""
            UPDATE {table}
            SET {column} = datetime({column}, '+{OFFSET_HOURS} hours')
            WHERE {column} IS NOT NULL
        """
        cursor.execute(sql)
        print(f"  {table}.{column}: {cursor.rowcount} 行已更新")

    conn.commit()
    conn.close()
    print("\n迁移完成！所有时间已从 UTC 转换为北京时间 (UTC+8)。")


if __name__ == '__main__':
    print(f"正在迁移 {DB_PATH} 中的时间字段 (UTC -> UTC+8)...\n")
    migrate()

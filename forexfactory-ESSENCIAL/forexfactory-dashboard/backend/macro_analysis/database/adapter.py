# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Database Adapter

Adapter para integração com backend/database.py existente.

Responsabilidades:
- Fazer ponte entre macro_analysis e backend/database.py
- Fornecer interface simplificada para repository
- Isolar lógica de acesso ao banco
- Permitir múltiplas implementações (SQLite, PostgreSQL, etc)

Padrão de Integração:
- Importa backend/database.py SEM modificá-lo
- Adiciona apenas wrapper/adapter layer
- Respeita convenções do sistema existente

Conformidade:
- Zero modificação em backend/database.py
- Integração via import direto
- Cláusula de Preservação de Código (ATIVA)

Nota Importante:
- Este adapter fornece interface genérica
- Implementação real depende da estrutura de backend/database.py
- Se backend/database.py usar padrão diferente, adapter deve ser ajustado
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Any

from .models import get_all_setup_sql, TABLE_NAME
from ..config import DATABASE_FILE


# ============================================================================
# DATABASE ADAPTER
# ============================================================================

class DatabaseAdapter:
    """
    Adapter para acesso ao banco de dados.
    
    Fornece interface simplificada para CRUD operations.
    Pode ser adaptado para diferentes implementações de backend/database.py.
    """
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        Inicializa adapter.
        
        Args:
            db_path: Caminho para arquivo de banco (SQLite)
                    Se None, usa DATABASE_FILE de config.py
        
        Note:
            Se backend/database.py já gerencia conexões,
            este adapter pode ser modificado para usar aquela infraestrutura.
        """
        self.db_path = db_path or DATABASE_FILE
        self.table_name = TABLE_NAME
        
        # Garantir que diretório existe
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Setup inicial (criar tabela se não existir)
        self._setup_database()
    
    # ========================================================================
    # SETUP
    # ========================================================================
    
    def _setup_database(self):
        """
        Cria tabela e índices se não existirem.
        
        Executa todos os SQLs de setup (CREATE TABLE, INDEXES, TRIGGER).
        """
        setup_sqls = get_all_setup_sql()
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            for sql in setup_sqls:
                cursor.execute(sql)
            
            conn.commit()
    
    # ========================================================================
    # CONNECTION MANAGEMENT
    # ========================================================================
    
    def _get_connection(self) -> sqlite3.Connection:
        """
        Obtém conexão com banco de dados.
        
        Returns:
            sqlite3.Connection: Conexão ativa
        
        Note:
            Se backend/database.py já gerencia pool de conexões,
            este método pode ser substituído para usar aquela infraestrutura.
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # Permite acesso por nome de coluna
        return conn
    
    # ========================================================================
    # INSERT
    # ========================================================================
    
    def insert(self, table: str, data: Dict) -> int:
        """
        Insere novo registro.
        
        Args:
            table: Nome da tabela
            data: Dict com dados (campo: valor)
        
        Returns:
            int: ID do registro inserido
        
        Example:
            >>> adapter.insert("macro_analysis_institutional", {
            ...     "week_start": "2026-01-04",
            ...     "week_end": "2026-01-10",
            ...     ...
            ... })
            1
        """
        fields = list(data.keys())
        placeholders = ", ".join(["?" for _ in fields])
        fields_str = ", ".join(fields)
        
        sql = f"INSERT INTO {table} ({fields_str}) VALUES ({placeholders})"
        values = [data[field] for field in fields]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            conn.commit()
            
            return cursor.lastrowid
    
    # ========================================================================
    # SELECT
    # ========================================================================
    
    def fetch_one(
        self, 
        table: str, 
        where: Optional[Dict] = None,
        order_by: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Recupera um único registro.
        
        Args:
            table: Nome da tabela
            where: Condições WHERE (campo: valor)
            order_by: Cláusula ORDER BY
        
        Returns:
            Dict com registro ou None se não encontrado
        
        Example:
            >>> adapter.fetch_one(
            ...     "macro_analysis_institutional",
            ...     where={"week_start": "2026-01-04"}
            ... )
            {"id": 1, "week_start": "2026-01-04", ...}
        """
        sql = f"SELECT * FROM {table}"
        values = []
        
        if where:
            conditions = [f"{field} = ?" for field in where.keys()]
            sql += " WHERE " + " AND ".join(conditions)
            values = list(where.values())
        
        if order_by:
            sql += f" ORDER BY {order_by}"
        
        sql += " LIMIT 1"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            
            return None
    
    def fetch_all(
        self,
        table: str,
        where: Optional[Dict] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict]:
        """
        Recupera múltiplos registros.
        
        Args:
            table: Nome da tabela
            where: Condições WHERE (campo: valor)
            order_by: Cláusula ORDER BY
            limit: Limite de resultados
            offset: Offset para paginação
        
        Returns:
            List[Dict]: Lista de registros
        """
        sql = f"SELECT * FROM {table}"
        values = []
        
        if where:
            conditions = [f"{field} = ?" for field in where.keys()]
            sql += " WHERE " + " AND ".join(conditions)
            values = list(where.values())
        
        if order_by:
            sql += f" ORDER BY {order_by}"
        
        if limit:
            sql += f" LIMIT {limit}"
        
        if offset:
            sql += f" OFFSET {offset}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            rows = cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    def count(self, table: str, where: Optional[Dict] = None) -> int:
        """
        Conta registros.
        
        Args:
            table: Nome da tabela
            where: Condições WHERE (campo: valor)
        
        Returns:
            int: Número de registros
        """
        sql = f"SELECT COUNT(*) as total FROM {table}"
        values = []
        
        if where:
            conditions = [f"{field} = ?" for field in where.keys()]
            sql += " WHERE " + " AND ".join(conditions)
            values = list(where.values())
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            result = cursor.fetchone()
            
            return result["total"] if result else 0
    
    # ========================================================================
    # UPDATE
    # ========================================================================
    
    def update(
        self, 
        table: str, 
        data: Dict, 
        where: Dict
    ) -> bool:
        """
        Atualiza registros existentes.
        
        Args:
            table: Nome da tabela
            data: Dict com campos a atualizar (campo: novo_valor)
            where: Condições WHERE (campo: valor)
        
        Returns:
            bool: True se atualizado com sucesso
        
        Example:
            >>> adapter.update(
            ...     "macro_analysis_institutional",
            ...     data={"is_frozen": 1},
            ...     where={"week_start": "2026-01-04"}
            ... )
            True
        """
        set_fields = [f"{field} = ?" for field in data.keys()]
        where_fields = [f"{field} = ?" for field in where.keys()]
        
        sql = f"UPDATE {table} SET {', '.join(set_fields)} WHERE {' AND '.join(where_fields)}"
        values = list(data.values()) + list(where.values())
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    # ========================================================================
    # DELETE (wrapper, mas delete não usado no repository)
    # ========================================================================
    
    def delete(self, table: str, where: Dict) -> bool:
        """
        Deleta registros.
        
        Note:
            Delete não é usado por MacroAnalysisRepository.
            Incluído apenas para completude do adapter.
        
        Args:
            table: Nome da tabela
            where: Condições WHERE (campo: valor)
        
        Returns:
            bool: True se deletado com sucesso
        """
        where_fields = [f"{field} = ?" for field in where.keys()]
        
        sql = f"DELETE FROM {table} WHERE {' AND '.join(where_fields)}"
        values = list(where.values())
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    # ========================================================================
    # RAW QUERY (para casos especiais)
    # ========================================================================
    
    def execute_raw(self, sql: str, values: Optional[List] = None) -> Any:
        """
        Executa query SQL raw.
        
        Use com cautela. Preferir métodos específicos (insert, fetch, etc).
        
        Args:
            sql: Statement SQL
            values: Valores para placeholders (?)
        
        Returns:
            Any: Resultado dependendo da query
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values or [])
            
            if sql.strip().upper().startswith("SELECT"):
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
            else:
                conn.commit()
                return cursor.rowcount
    
    # ========================================================================
    # HEALTH CHECK
    # ========================================================================
    
    def is_healthy(self) -> bool:
        """
        Verifica se conexão com banco está saudável.
        
        Returns:
            bool: True se saudável
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                return True
        except Exception:
            return False
    
    def get_table_info(self) -> Dict:
        """
        Retorna informações sobre a tabela macro_analysis_institutional.
        
        Returns:
            Dict: Info sobre a tabela (colunas, índices, etc)
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Schema da tabela
            cursor.execute(f"PRAGMA table_info({self.table_name})")
            columns = cursor.fetchall()
            
            # Índices
            cursor.execute(f"PRAGMA index_list({self.table_name})")
            indexes = cursor.fetchall()
            
            # Contagem de registros
            cursor.execute(f"SELECT COUNT(*) as total FROM {self.table_name}")
            count_result = cursor.fetchone()
            
            return {
                "table_name": self.table_name,
                "columns": [dict(col) for col in columns],
                "indexes": [dict(idx) for idx in indexes],
                "total_records": count_result["total"] if count_result else 0,
                "db_path": str(self.db_path),
            }


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def get_database_adapter(db_path: Optional[Path] = None) -> DatabaseAdapter:
    """
    Factory para criar instância de DatabaseAdapter.
    
    Args:
        db_path: Caminho para arquivo de banco (opcional)
    
    Returns:
        DatabaseAdapter: Instância configurada
    
    Example:
        >>> adapter = get_database_adapter()
        >>> adapter.is_healthy()
        True
    """
    return DatabaseAdapter(db_path=db_path)
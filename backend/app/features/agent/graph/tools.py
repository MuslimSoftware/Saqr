import os
import re
import json
import ast
import logging
from typing import Dict, Any, Set
from dotenv import load_dotenv
from langchain_tavily.tavily_search import TavilySearch
from langchain.chat_models import init_chat_model
from langchain_core.tools import Tool
from sqlalchemy import text
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from app.infrastructure.database import get_sql_engine, get_external_mongo_db
from app.config.environment import environment

try:
    import sqlparse
except ImportError:
    raise ImportError("sqlparse is required for secure SQL parsing. Install with: pip install sqlparse")

load_dotenv()
logger = logging.getLogger(__name__)

# Security: Allowlisted tables and columns for read access
ALLOWED_TABLES = {
    'actor', 'address', 'category', 'city', 'country',
    'customer', 'film', 'film_actor', 'film_category',
    'inventory', 'language', 'payment', 'rental',
    'staff', 'store'
}

DANGEROUS_KEYWORDS = {
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
    'REPLACE', 'MERGE', 'CALL', 'EXECUTE', 'EXEC', 'SYSTEM', 'LOAD_FILE',
    'INTO OUTFILE', 'INTO DUMPFILE', 'LOAD DATA', 'GRANT', 'REVOKE'
}

def query_sql_db(query: str) -> Any:
    """
    Query a SQL database about a movie rental business.

    *IMPORTANT*: ONLY use this to read data, not to write data.

    Tables available:
    - actor (actor_id, first_name, last_name, last_update)
    - address (address_id, address, address2, district, city_id, postal_code, phone, last_update)
    - category (category_id, name, last_update)
    - city (city_id, city, country_id, last_update)
    - country (country_id, country, last_update)
    - customer (customer_id, store_id, first_name, last_name, email, address_id, active, create_date, last_update)
    - film (film_id, title, description, release_year, language_id, original_language_id, rental_duration, rental_rate, length, replacement_cost, rating, special_features, last_update)
    - film_actor (actor_id, film_id, last_update)
    - film_category (film_id, category_id, last_update)
    - inventory (inventory_id, film_id, store_id, last_update)
    - language (language_id, name, last_update)
    - payment (payment_id, customer_id, staff_id, rental_id, amount, payment_date, last_update)
    - rental (rental_id, rental_date, inventory_id, customer_id, return_date, staff_id, last_update)
    - staff (staff_id, first_name, last_name, address_id, picture, email, store_id, active, username, password, last_update)
    - store (store_id, manager_staff_id, address_id, last_update)

    Args:
        query: SQL query (SELECT/WITH only on allowed tables, max 15 rows)

    Returns:
        List of dictionaries (rows) or error dict
    """
    original_query = query
    query = query.strip()
    timeout_seconds = 10
    
    # 1. Parse with sqlparse (required dependency)
    try:
        parsed = sqlparse.parse(query)
        if len(parsed) != 1 or not parsed[0].tokens:
            return {"error": "Exactly one SQL statement required"}
    except Exception as e:
        return {"error": f"SQL parsing failed: {e}"}
    
    # 2. Remove comments and normalize whitespace
    clean_query = sqlparse.format(query, strip_comments=True, strip_whitespace=True).strip()
    
    # 3. Check for multiple statements after normalization
    statements = [s.strip() for s in clean_query.split(';') if s.strip()]
    if len(statements) > 1:
        return {"error": "Multiple statements not allowed"}
    
    clean_query = statements[0] if statements else clean_query.rstrip(';')
    
    # 4. Validate statement type (very restricted SHOW)
    if not re.match(r'^\s*(SELECT|WITH)\b', clean_query, re.IGNORECASE):
        # Only allow specific SHOW commands
        if re.match(r'^\s*SHOW\s+(TABLES|COLUMNS\s+FROM\s+\w+)\s*$', clean_query, re.IGNORECASE):
            pass  # Allowed SHOW variant
        else:
            return {"error": "Only SELECT, WITH, SHOW TABLES, and SHOW COLUMNS FROM <table> allowed"}
    
    # 5. Token-based dangerous keyword detection
    try:
        tokens = list(sqlparse.parse(clean_query)[0].flatten())
        token_values = {token.value.upper() for token in tokens if token.ttype is None}
        
        for keyword in DANGEROUS_KEYWORDS:
            if keyword in token_values or any(keyword in val for val in token_values):
                return {"error": f"Prohibited operation detected: {keyword}"}
    except Exception:
        # Fallback to regex on normalized query
        if any(re.search(r'\b' + re.escape(kw) + r'\b', clean_query, re.IGNORECASE) for kw in DANGEROUS_KEYWORDS):
            return {"error": "Query contains prohibited operations"}
    
    # 6. Table allowlist validation
    table_pattern = r'\b(?:FROM|JOIN|UPDATE|INTO)\s+([`"\w]+)(?:\s+AS\s+\w+)?'
    referenced_tables = {match.strip('`"').lower() for match in re.findall(table_pattern, clean_query, re.IGNORECASE)}
    
    unauthorized_tables = referenced_tables - ALLOWED_TABLES
    if unauthorized_tables:
        return {"error": f"Access denied to tables: {', '.join(unauthorized_tables)}"}
    
    # 7. Auto-add LIMIT for SELECT queries
    if re.match(r'^\s*SELECT\b', clean_query, re.IGNORECASE) and not re.search(r'\bLIMIT\s+\d+\b', clean_query, re.IGNORECASE):
        clean_query += " LIMIT 15"
    
    # 8. Execute with proper timeout and connection management
    engine = None
    connection = None
    
    def _execute_query():
        nonlocal engine, connection
        engine = get_sql_engine()
        connection = engine.connect()
        
        # Set server-side timeout (database-specific)
        dialect_name = engine.dialect.name.lower()
        if dialect_name == 'mysql':
            connection.execute(text("SET SESSION MAX_EXECUTION_TIME = :timeout"), {"timeout": timeout_seconds * 1000})
        elif dialect_name == 'postgresql':
            connection.execute(text("SET LOCAL statement_timeout = :timeout"), {"timeout": f"{timeout_seconds}s"})
        
        # Execute query
        result = connection.execute(text(clean_query))
        return [dict(row) for row in result.mappings()]
    
    try:
        # Audit log
        logger.info(f"SQL_QUERY_EXECUTED: {clean_query[:100]}{'...' if len(clean_query) > 100 else ''}")
        
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_execute_query)
            try:
                return future.result(timeout=timeout_seconds + 1)
            except FuturesTimeoutError:
                # Cancel connection on timeout
                if connection:
                    try:
                        connection.close()
                    except Exception:
                        pass
                if engine:
                    try:
                        engine.dispose()
                    except Exception:
                        pass
                return {"error": f"Query timed out after {timeout_seconds}s"}
                
    except Exception as e:
        logger.error(f"SQL_QUERY_ERROR: {e} | Query: {original_query}")
        return {"error": str(e)}
    finally:
        # Cleanup
        if connection:
            try:
                connection.close()
            except Exception:
                pass

# Simplified Mongo query tool (synchronous) with timeout
def query_mongo_db(filter: Dict[str, Any], sort: Dict[str, Any] = None) -> Any:
    """
    Query a MongoDB database containing application logs.
    This is useful for debugging and understanding application behavior.
    Context is the main key to filter the logs if not specified otherwise.
    Don't retry this tool with the same filter if it times out.

    Schema:
    {
        "_id": { "$oid": "..." },
        "request": "...",
        "response": "...",
        "status": 200,
        "context": "<context_name>",
        "level": "info",
        "source": "POST http://endpoint",
        "transaction_id": "...",
        "date_added": { "$date": "..." },
        "user_agent": "...",
        "pid": "..."
    }

    Args:
        filter: The filter to apply to the query (e.g., {'context': 'some_flow'})
        sort: The sort to apply to the query (optional)

    Returns:
        A list of context strings
    """
    timeout_seconds = 10
    limit = 200
    # Accept filter as JSON string or Python literal dict
    if isinstance(filter, str):
        try:
            filter = json.loads(filter)
        except Exception as e_json:
            try:
                filter = ast.literal_eval(filter)
            except Exception as e_ast:
                return {"error": f"Invalid filter format, JSON error: {e_json}; Literal eval error: {e_ast}"}
    if not isinstance(filter, dict):
        return {"error": "Filter must be a dict"}
    
    # Validate filter is not empty
    if not filter or len(filter) == 0:
        return {"error": "Filter cannot be empty. Please provide at least one filter criterion (e.g., {'context': 'booking_flow'} or {'booking_id': 123456})"}
    
    # Validate limit is greater than 0
    if limit <= 0:
        return {"error": "Limit must be greater than 0"}
    
    def _execute_query():
        """Inner function to execute the MongoDB query"""
        db = get_external_mongo_db()
        cursor = db["debug_logs"].find(filter)
        
        # Apply sort if provided
        if sort:
            cursor = cursor.sort(list(sort.items()))
        
        # Apply limit and timeout
        cursor = cursor.limit(limit).max_time_ms(timeout_seconds * 1000)
        docs = list(cursor)
        return [doc["context"] for doc in docs]
    
    try:
        print(f"Querying MongoDB database with filter: {filter} (timeout: {timeout_seconds}s)")
        
        # Use ThreadPoolExecutor for Python-level timeout as backup
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_execute_query)
            try:
                context_list = future.result(timeout=timeout_seconds + 2)  # Add 2s buffer
                return context_list
            except FuturesTimeoutError:
                print(f"MongoDB query timed out after {timeout_seconds} seconds")
                return {"error": f"Query timed out after {timeout_seconds} seconds"}
                
    except Exception as e:
        print(f"Error querying MongoDB database: {e}")
        return {"error": str(e)}

async def search_web(query: str) -> Any:
    """
    Search the web for up-to-date information or general knowledge.

    Args:
        query: The query to search the web for

    Returns:
        search results
    """
    try:
        return await TavilySearch(max_results=2).arun(query)
    except Exception as e:
        print(f"Error performing web search: {e}")
        return {"error": str(e)}

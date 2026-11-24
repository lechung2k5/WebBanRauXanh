import subprocess
import collections
import os

res_cols = subprocess.check_output([
    'docker', 'exec', 'webbanrau_postgres', 'psql', '-U', 'postgres', '-d', 'webbanrau_db',
    '-t', '-A', '-F|', '-c', '''
    SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale, c.is_nullable
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name != 'flyway_schema_history'
    ORDER BY c.table_name, c.ordinal_position;
    '''
], text=True, encoding='utf-8')

res_pks = subprocess.check_output([
    'docker', 'exec', 'webbanrau_postgres', 'psql', '-U', 'postgres', '-d', 'webbanrau_db',
    '-t', '-A', '-F|', '-c', '''
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY';
    '''
], text=True, encoding='utf-8')

res_fks = subprocess.check_output([
    'docker', 'exec', 'webbanrau_postgres', 'psql', '-U', 'postgres', '-d', 'webbanrau_db',
    '-t', '-A', '-F|', '-c', '''
    SELECT tc.table_name, kcu.column_name, ccu.table_name, ccu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name != 'flyway_schema_history' AND ccu.table_name != 'flyway_schema_history';
    '''
], text=True, encoding='utf-8')

tables = collections.defaultdict(list)
for line in res_cols.strip().split('\n'):
    if not line:
        continue
    t, col, dt, max_len, num_p, num_s, nullable = line.split('|')
    type_str = dt
    if dt in ('character varying', 'varchar'):
        type_str = f'varchar({max_len})' if max_len else 'varchar'
    elif dt == 'character':
        type_str = f'char({max_len})' if max_len else 'char'
    elif dt == 'numeric':
        if num_p and num_s:
            type_str = f'numeric({num_p},{num_s})'
        elif num_p:
            type_str = f'numeric({num_p})'
        else:
            type_str = 'numeric'
    elif dt in ('timestamp with time zone', 'timestamptz'):
        type_str = 'timestamptz'
    elif dt in ('timestamp without time zone', 'timestamp'):
        type_str = 'timestamp'
    elif dt == 'double precision':
        type_str = 'double'
    elif dt == 'USER-DEFINED':
        type_str = 'vector'

    tables[t].append((col, type_str, nullable == 'YES'))

pks = collections.defaultdict(set)
for line in res_pks.strip().split('\n'):
    if not line:
        continue
    t, col = line.split('|')
    pks[t].add(col)

fks = []
fk_set = set()
for line in res_fks.strip().split('\n'):
    if not line:
        continue
    parts = line.split('|')
    if len(parts) == 4:
        key = (parts[0], parts[1], parts[2], parts[3])
        if key not in fk_set:
            fk_set.add(key)
            fks.append(key)

# 1. GENERATE DBML
dbml_lines = [
    '// ==============================================================================',
    '// HONA FRESH B2B PLATFORM - DATABASE SCHEMA (DBML FOR DBDIAGRAM.IO)',
    '// Copy toan bo noi dung file nay va dan truc tiep vao dbdiagram.io',
    '// ==============================================================================\n',
    'Project HONA_FRESH {',
    '  database_type: "PostgreSQL"',
    '  Note: "HONA FRESH - B2B Agriculture Marketplace and Cold Chain Logistics Ecosystem"',
    '}\n'
]

table_groups = {
    'Identity_and_Auth': ['users', 'roles', 'users_roles', 'farmer_profiles', 'buyer_profiles', 'buyer_warehouses', 'refresh_tokens', 'email_otp_verifications', 'auth_audit'],
    'B2B_Marketplace_and_RFQ': ['categories', 'products', 'harvest_lots', 'rfq_negotiations', 'rfq_negotiation_events', 'b2b_chat_messages', 'buyer_rfqs'],
    'Contracts_and_Escrow': ['b2b_contracts', 'payment_transactions', 'settlements', 'b2b_reviews', 'spoilage_claims'],
    'Inbound_Fleet_and_Pickup': ['fleet_vehicles', 'fleet_drivers', 'warehouse_hubs', 'pickup_trips', 'pickup_trip_stops', 'shipments'],
    'Hub_QC_and_Outbound_Delivery': ['outbound_delivery_trips', 'outbound_delivery_stops', 'hub_inspections', 'qc_inspections'],
    'Cold_Chain_and_IoT': ['cold_assets', 'iot_sensor_logs'],
    'Accounting_and_Audit': ['gl_journal_entries', 'gl_journal_lines', 'business_audit', 'uploaded_assets', 'platform_settings', 'orders', 'order_items']
}

for t, cols in tables.items():
    dbml_lines.append(f'Table {t} {{')
    for col, dt, is_null in cols:
        attrs = []
        if col in pks[t]:
            attrs.append('pk')
            if col == 'id' and 'int' in dt:
                attrs.append('increment')
        if not is_null and col not in pks[t]:
            attrs.append('not null')
        attr_str = f' [{", ".join(attrs)}]' if attrs else ''
        clean_dt = dt.replace(' ', '_')
        dbml_lines.append(f'  {col} {clean_dt}{attr_str}')
    dbml_lines.append('}\n')

dbml_lines.append('// ==============================================================================')
dbml_lines.append('// RELATIONSHIPS (FOREIGN KEYS)')
dbml_lines.append('// ==============================================================================\n')
for t, col, ref_t, ref_col in fks:
    dbml_lines.append(f'Ref: {t}.{col} > {ref_t}.{ref_col}')
dbml_lines.append('')

dbml_lines.append('// ==============================================================================')
dbml_lines.append('// TABLE GROUPS')
dbml_lines.append('// ==============================================================================\n')
for grp, tbls in table_groups.items():
    dbml_lines.append(f'TableGroup {grp} {{')
    for tbl in tbls:
        if tbl in tables:
            dbml_lines.append(f'  {tbl}')
    dbml_lines.append('}\n')

out_dbml = '\n'.join(dbml_lines)
with open('e:/HOCTAP/WWW/BTL_WebBanRau/docs/database/HONA_FRESH_dbdiagram.dbml', 'w', encoding='utf-8') as f:
    f.write(out_dbml)

# 2. GENERATE CLEAN SQL DDL
sql_lines = [
    '-- ==============================================================================',
    '-- HONA FRESH B2B PLATFORM - CLEAN POSTGRESQL DDL FOR DBDIAGRAM.IO / DRAWSQL',
    '-- Chon: Import -> Import from PostgreSQL tren dbdiagram.io roi dan file nay',
    '-- ==============================================================================\n'
]

for t, cols in tables.items():
    sql_lines.append(f'CREATE TABLE {t} (')
    col_defs = []
    for col, dt, is_null in cols:
        col_type = dt.upper()
        if col in pks[t] and col == 'id' and 'INT' in col_type:
            col_type = 'BIGSERIAL' if 'BIG' in col_type else 'SERIAL'
            col_def = f'    {col} {col_type} PRIMARY KEY'
        else:
            nullable_str = '' if is_null else ' NOT NULL'
            pk_str = ' PRIMARY KEY' if col in pks[t] and len(pks[t]) == 1 else ''
            col_def = f'    {col} {col_type}{nullable_str}{pk_str}'
        col_defs.append(col_def)

    if len(pks[t]) > 1:
        col_defs.append(f'    PRIMARY KEY ({", ".join(sorted(pks[t]))})')

    sql_lines.append(',\n'.join(col_defs))
    sql_lines.append(');\n')

sql_lines.append('-- ==============================================================================')
sql_lines.append('-- FOREIGN KEY CONSTRAINTS')
sql_lines.append('-- ==============================================================================\n')
for idx, (t, col, ref_t, ref_col) in enumerate(fks, 1):
    sql_lines.append(f'ALTER TABLE {t} ADD CONSTRAINT fk_{t}_{col}_{idx} FOREIGN KEY ({col}) REFERENCES {ref_t}({ref_col});')

out_sql = '\n'.join(sql_lines)
with open('e:/HOCTAP/WWW/BTL_WebBanRau/docs/database/HONA_FRESH_dbdiagram.sql', 'w', encoding='utf-8') as f:
    f.write(out_sql)

print('SUCCESS: Generated HONA_FRESH_dbdiagram.dbml and HONA_FRESH_dbdiagram.sql')

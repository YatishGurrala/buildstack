#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE core_db;
  CREATE DATABASE project1_db;
  CREATE DATABASE project2_db;
EOSQL

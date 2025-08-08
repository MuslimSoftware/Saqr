FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=rootpass
ENV MYSQL_DATABASE=sakila

# Copy local Sakila database files
COPY sakila-db/sakila-schema.sql /docker-entrypoint-initdb.d/01-sakila-schema.sql
COPY sakila-db/sakila-data.sql /docker-entrypoint-initdb.d/02-sakila-data.sql

EXPOSE 3306
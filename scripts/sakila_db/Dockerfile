FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=rootpass
ENV MYSQL_DATABASE=sakila

# Download and install Sakila sample database
ADD https://downloads.mysql.com/docs/sakila-db.tar.gz /tmp/
RUN cd /tmp && tar -xzf sakila-db.tar.gz

# Copy the Sakila schema and data files to docker-entrypoint-initdb.d
# This directory is automatically processed by the MySQL container on first start
RUN cp /tmp/sakila-db/sakila-schema.sql /docker-entrypoint-initdb.d/01-sakila-schema.sql
RUN cp /tmp/sakila-db/sakila-data.sql /docker-entrypoint-initdb.d/02-sakila-data.sql

# Clean up
RUN rm -rf /tmp/sakila-db*

EXPOSE 3306
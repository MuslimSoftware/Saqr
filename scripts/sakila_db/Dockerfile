FROM mysql:5.7

# Install wget using yum without updating everything
RUN yum install -y wget && yum clean all && rm -rf /var/cache/yum

# Download Sakila schema and data into the directory that MySQL uses for initialization scripts
RUN wget https://downloads.mysql.com/docs/sakila-db.tar.gz && \
    tar -xvf sakila-db.tar.gz && \
    cp sakila-db/sakila-schema.sql /docker-entrypoint-initdb.d/1_schema.sql && \
    cp sakila-db/sakila-data.sql /docker-entrypoint-initdb.d/2_data.sql && \
    rm -rf sakila-db.tar.gz sakila-db

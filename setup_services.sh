#!/bin/bash
set -e

# Configure PostgreSQL
sed -i "s/#listen_addresses = .*/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::/0 md5" >> /etc/postgresql/16/main/pg_hba.conf

# Configure Redis
sed -i "s/bind 127.0.0.1 ::1/bind 0.0.0.0/" /etc/redis/redis.conf
sed -i "s/protected-mode yes/protected-mode no/" /etc/redis/redis.conf

# Restart services
service postgresql restart
service redis-server restart

# Setup DB user and database
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgrespassword';\""
su - postgres -c "psql -c \"SELECT 1 FROM pg_database WHERE datname='email_scheduler'\" | grep -q 1 || psql -c \"CREATE DATABASE email_scheduler;\""

echo "POSTGRES_AND_REDIS_READY"

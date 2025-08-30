#!/bin/bash

# NGI Capital Database Backup Script
# Runs daily backups of the database

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "Starting database backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Backup based on database type
if [ -n "${POSTGRES_HOST}" ]; then
    # PostgreSQL backup
    BACKUP_FILE="${BACKUP_DIR}/ngi_capital_${TIMESTAMP}.sql.gz"
    
    echo "Backing up PostgreSQL database..."
    PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
        -h ${POSTGRES_HOST} \
        -U ${POSTGRES_USER} \
        -d ${POSTGRES_DB} \
        --no-owner \
        --no-acl \
        | gzip > ${BACKUP_FILE}
    
    echo "PostgreSQL backup completed: ${BACKUP_FILE}"
else
    # SQLite backup
    BACKUP_FILE="${BACKUP_DIR}/ngi_capital_${TIMESTAMP}.db"
    
    echo "Backing up SQLite database..."
    cp /app/data/ngi_capital.db ${BACKUP_FILE}
    gzip ${BACKUP_FILE}
    
    echo "SQLite backup completed: ${BACKUP_FILE}.gz"
fi

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "ngi_capital_*.gz" -mtime +${RETENTION_DAYS} -delete

# List current backups
echo "Current backups:"
ls -lh ${BACKUP_DIR}/*.gz 2>/dev/null || echo "No backups found"

echo "Backup process completed at $(date)"
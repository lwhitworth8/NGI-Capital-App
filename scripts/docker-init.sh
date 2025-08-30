#!/bin/bash

# NGI Capital Docker Initialization Script
# This script initializes the database and sets up the application for first run

set -e

echo "========================================="
echo "NGI Capital Docker Initialization"
echo "========================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Initialize database if needed
if [ ! -f /app/data/.initialized ]; then
    echo "Initializing database..."
    
    # Run database initialization
    python /app/init_db_simple.py
    
    # Mark as initialized
    touch /app/data/.initialized
    
    echo "Database initialization complete!"
else
    echo "Database already initialized, skipping..."
fi

# Run any pending migrations
echo "Checking for database migrations..."
if [ -f /app/scripts/migrate.py ]; then
    python /app/scripts/migrate.py
fi

# Verify database connection
echo "Verifying database connection..."
python -c "
import sqlite3
conn = sqlite3.connect('/app/data/ngi_capital.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM partners')
count = cursor.fetchone()[0]
print(f'Database connected. Found {count} partners.')
conn.close()
"

# Create required directories
echo "Creating required directories..."
mkdir -p /app/logs /app/uploads /app/temp /app/backups

# Set proper permissions
echo "Setting permissions..."
chmod -R 755 /app/logs /app/uploads /app/temp
chmod 644 /app/data/ngi_capital.db

echo "========================================="
echo "Initialization complete!"
echo "========================================="

# Start the application
echo "Starting NGI Capital API..."
exec "$@"
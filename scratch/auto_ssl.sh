#!/bin/bash
set -e

# Configuration
DB_USER="agility"
DB_PASS="dbpassword123"
DB_NAME="agility_asturias"
STATE_FILE="/root/current_ssl_domains.txt"

# Base domains
DOMAINS="agilityasturias.com www.agilityasturias.com clubagility.com www.clubagility.com admin.clubagility.com www.admin.clubagility.com"

# Fetch active club slugs from MariaDB
SLUGS=$(mysql -u"$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -N -B -e "SELECT slug FROM clubs WHERE id > 1;")
for slug in $SLUGS; do
    DOMAINS="$DOMAINS $slug.clubagility.com www.$slug.clubagility.com"
done

# Fetch custom domains from MariaDB
CUSTOM_DOMAINS=$(mysql -u"$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -N -B -e "SELECT domain FROM clubs WHERE domain IS NOT NULL AND domain != '';")
for dom in $CUSTOM_DOMAINS; do
    DOMAINS="$DOMAINS $dom www.$dom"
done

# Sort and normalize domain list
SORTED_DOMAINS=$(echo "$DOMAINS" | tr ' ' '\n' | sort -u | tr '\n' ' ' | xargs)

# Read previous domains
PREV_DOMAINS=""
if [ -f "$STATE_FILE" ]; then
    PREV_DOMAINS=$(cat "$STATE_FILE")
fi

if [ "$SORTED_DOMAINS" != "$PREV_DOMAINS" ]; then
    echo "Domain list changed. Updating SSL certificate..."
    echo "Old list: $PREV_DOMAINS"
    echo "New list: $SORTED_DOMAINS"
    
    # Build certbot arguments
    CERTBOT_ARGS=""
    for d in $SORTED_DOMAINS; do
        CERTBOT_ARGS="$CERTBOT_ARGS -d $d"
    done
    
    # Run certbot to expand certificate
    certbot --nginx $CERTBOT_ARGS --expand --non-interactive
    
    # Save new list
    echo "$SORTED_DOMAINS" > "$STATE_FILE"
    echo "SSL certificate successfully updated and deployed."
else
    echo "No domain changes detected. Current SSL certificate is up to date."
fi

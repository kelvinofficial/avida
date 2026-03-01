#!/bin/bash
#
# Avida Backend Full Deployment Script
# This script deploys the complete backend with all routes
#

set -e

echo "=========================================="
echo "  Avida Backend Deployment Script"
echo "=========================================="

# Configuration
DEPLOY_DIR="/app/backend"
BACKUP_DIR="/app/backup_$(date +%Y%m%d_%H%M%S)"
DOWNLOAD_URL="https://prod-upgrade.preview.emergentagent.com/deploy-package/backend-full.zip"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating backup of existing backend...${NC}"
if [ -d "$DEPLOY_DIR" ]; then
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}Backup created at: $BACKUP_DIR${NC}"
else
    echo "No existing backend found, skipping backup"
fi

echo -e "${YELLOW}Step 2: Downloading latest backend...${NC}"
cd /tmp
rm -f backend-full.zip
curl -L -o backend-full.zip "$DOWNLOAD_URL"
echo -e "${GREEN}Download complete${NC}"

echo -e "${YELLOW}Step 3: Extracting files...${NC}"
rm -rf /tmp/backend_extract
mkdir -p /tmp/backend_extract
unzip -o backend-full.zip -d /tmp/backend_extract
echo -e "${GREEN}Extraction complete${NC}"

echo -e "${YELLOW}Step 4: Deploying backend files...${NC}"
# Preserve existing .env file
if [ -f "$DEPLOY_DIR/.env" ]; then
    cp "$DEPLOY_DIR/.env" /tmp/env_backup
fi

# Copy new files
cp -r /tmp/backend_extract/backend/* "$DEPLOY_DIR/"

# Restore .env if it existed
if [ -f "/tmp/env_backup" ]; then
    cp /tmp/env_backup "$DEPLOY_DIR/.env"
    echo -e "${GREEN}.env file preserved${NC}"
fi

echo -e "${YELLOW}Step 5: Installing dependencies...${NC}"
cd "$DEPLOY_DIR"
pip install -r requirements.txt --quiet

echo -e "${YELLOW}Step 6: Restarting backend service...${NC}"
if command -v supervisorctl &> /dev/null; then
    sudo supervisorctl restart backend
    echo -e "${GREEN}Backend restarted via supervisor${NC}"
elif command -v systemctl &> /dev/null; then
    sudo systemctl restart backend
    echo -e "${GREEN}Backend restarted via systemd${NC}"
else
    echo -e "${YELLOW}Please restart the backend service manually${NC}"
fi

echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"
sleep 5

# Test health endpoint
HEALTH_CHECK=$(curl -s http://localhost:8001/api/health 2>/dev/null || echo "failed")
if [[ "$HEALTH_CHECK" == *"healthy"* ]]; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed. Check logs: tail -f /var/log/supervisor/backend.err.log${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "New endpoints available:"
echo "  - /api/users"
echo "  - /api/badges"
echo "  - /api/vouchers"
echo "  - /api/banners"
echo "  - /api/escrow"
echo "  - /api/business-profiles"
echo "  - /api/verification"
echo "  - ... and 50+ more routes"
echo ""
echo "Test with: curl http://localhost:8001/api/health"
echo ""

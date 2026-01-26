#!/bin/bash
# SynapseStrike Platform Installer
# Installs and configures all three components: Trading Platform, LocalAI, and AIArchitect

set -e

echo "=========================================="
echo "  SynapseStrike Platform Installer"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Check NVIDIA GPU (optional but recommended)
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✓ NVIDIA GPU detected${NC}"
    GPU_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ No NVIDIA GPU detected. LocalAI will run on CPU (slower).${NC}"
    GPU_AVAILABLE=false
fi

echo ""
echo "Select components to install:"
echo "1) Full Stack (LocalAI + AIArchitect + Trading Platform)"
echo "2) LocalAI only"
echo "3) AIArchitect only"
echo "4) Trading Platform only"
echo "5) LocalAI + AIArchitect"
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "${GREEN}Installing Full Stack...${NC}"
        INSTALL_LOCALAI=true
        INSTALL_AIARCHITECT=true
        INSTALL_TRADING=true
        ;;
    2)
        INSTALL_LOCALAI=true
        INSTALL_AIARCHITECT=false
        INSTALL_TRADING=false
        ;;
    3)
        INSTALL_LOCALAI=false
        INSTALL_AIARCHITECT=true
        INSTALL_TRADING=false
        ;;
    4)
        INSTALL_LOCALAI=false
        INSTALL_AIARCHITECT=false
        INSTALL_TRADING=true
        ;;
    5)
        INSTALL_LOCALAI=true
        INSTALL_AIARCHITECT=true
        INSTALL_TRADING=false
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""

# Install LocalAI
if [ "$INSTALL_LOCALAI" = true ]; then
    echo -e "${YELLOW}Installing LocalAI...${NC}"
    cd LocalAI
    if [ "$GPU_AVAILABLE" = true ]; then
        docker compose up -d
    else
        echo -e "${YELLOW}GPU not available, using CPU version (slower)${NC}"
        docker compose up -d
    fi
    cd ..
    echo -e "${GREEN}✓ LocalAI installed and running on port 8050${NC}"
    echo "  Access: http://localhost:8050"
fi

# Install AIArchitect
if [ "$INSTALL_AIARCHITECT" = true ]; then
    echo -e "${YELLOW}Installing AIArchitect...${NC}"
    cd AIArchitect
    
    # Check if .env exists, if not create from example
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo -e "${YELLOW}⚠ Created .env from .env.example. Please review and update if needed.${NC}"
        fi
    fi
    
    docker compose up -d
    cd ..
    echo -e "${GREEN}✓ AIArchitect installed and running${NC}"
    echo "  Backend: http://localhost:8065"
    echo "  Qdrant: http://localhost:8063"
    echo "  PostgreSQL: localhost:8064"
fi

# Install Trading Platform
if [ "$INSTALL_TRADING" = true ]; then
    echo -e "${YELLOW}Installing SynapseStrike Trading Platform...${NC}"
    cd SynapseStrike
    
    # Check if install script exists
    if [ -f install.sh ]; then
        chmod +x install.sh
        ./install.sh
    else
        # Run with Docker Compose if available
        if [ -f docker-compose.yml ]; then
            docker compose up -d
        else
            echo -e "${YELLOW}⚠ No install script or docker-compose.yml found${NC}"
        fi
    fi
    cd ..
    echo -e "${GREEN}✓ Trading Platform installed${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=========================================="
echo ""

if [ "$INSTALL_LOCALAI" = true ]; then
    echo "LocalAI:"
    echo "  - API: http://localhost:8050"
    echo "  - Status: Run 'docker logs localai' to check"
    echo ""
fi

if [ "$INSTALL_AIARCHITECT" = true ]; then
    echo "AIArchitect:"
    echo "  - Web UI: http://localhost:8065"
    echo "  - Qdrant: http://localhost:8063/dashboard"
    echo ""
fi

if [ "$INSTALL_TRADING" = true ]; then
    echo "Trading Platform:"
    echo "  - Check SynapseStrike/README.md for access details"
    echo ""
fi

echo "Next steps:"
echo "1. Wait 2-3 minutes for all services to start"
echo "2. Check service status: docker ps"
echo "3. View logs: docker compose logs -f"
echo "4. Read ENHANCEMENT_PLAN.html for feature roadmap"
echo ""
echo -e "${GREEN}Happy Trading! 🚀${NC}"

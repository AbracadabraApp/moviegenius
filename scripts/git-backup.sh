#!/bin/bash
# Git Repository Backup and Safety Script
# Prevents repository loss and ensures regular backups

set -e

PROJECT_DIR="/Users/josh.petersen/moviegenius"
BACKUP_DIR="/Users/josh.petersen/.git-backups/moviegenius"
LOG_FILE="/Users/josh.petersen/.git-backups/backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to create backup
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_path="$BACKUP_DIR/backup_$timestamp"
    
    log "Creating backup: $backup_path"
    
    # Copy entire .git directory
    cp -R "$PROJECT_DIR/.git" "$backup_path"
    
    # Create compressed archive
    cd "$BACKUP_DIR"
    tar -czf "backup_$timestamp.tar.gz" "backup_$timestamp"
    rm -rf "backup_$timestamp"
    
    log "Backup created successfully: backup_$timestamp.tar.gz"
}

# Function to check repository integrity
check_integrity() {
    cd "$PROJECT_DIR"
    
    if ! git fsck >/dev/null 2>&1; then
        log "WARNING: Repository integrity check failed!"
        return 1
    fi
    
    if ! git status >/dev/null 2>&1; then
        log "WARNING: Git status check failed!"
        return 1
    fi
    
    log "Repository integrity check passed"
    return 0
}

# Function to auto-push if there are unpushed commits
auto_push() {
    cd "$PROJECT_DIR"
    
    # Check if there are unpushed commits
    if [ "$(git log origin/main..HEAD --oneline | wc -l)" -gt 0 ]; then
        log "Found unpushed commits, attempting to push..."
        if git push origin main 2>>"$LOG_FILE"; then
            log "Successfully pushed commits to remote"
        else
            log "WARNING: Failed to push commits to remote"
        fi
    else
        log "No unpushed commits found"
    fi
}

# Function to clean old backups (keep last 10)
cleanup_old_backups() {
    cd "$BACKUP_DIR"
    local backup_count=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt 10 ]; then
        log "Cleaning up old backups (keeping last 10)"
        ls -1t backup_*.tar.gz | tail -n +11 | xargs rm -f
    fi
}

# Main execution
main() {
    log "Starting git backup and safety check"
    
    # Check if we're in a git repository
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        log "ERROR: No git repository found at $PROJECT_DIR"
        exit 1
    fi
    
    # Check repository integrity
    if ! check_integrity; then
        log "Repository integrity issues detected!"
    fi
    
    # Auto-push unpushed commits
    auto_push
    
    # Create backup
    create_backup
    
    # Clean old backups
    cleanup_old_backups
    
    log "Git backup and safety check completed"
}

# Run main function
main "$@"
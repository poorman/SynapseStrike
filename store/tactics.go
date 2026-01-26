package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

type TacticStore struct {
	db *sql.DB
}

type Tactic struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	StrategyType string    `json:"strategy_type"` // sonnet, opus, current, cursor, or empty for default
	IsActive     bool      `json:"is_active"`
	IsDefault    bool      `json:"is_default"`
	Config       string    `json:"config"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type TacticConfig = StrategyConfig

func GetDefaultTacticConfig(lang string) TacticConfig {
	return GetDefaultStrategyConfig(lang)
}

func (s *TacticStore) initTables() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS tactics (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			strategy_type TEXT DEFAULT 'sonnet',
			is_active BOOLEAN DEFAULT 0,
			is_default BOOLEAN DEFAULT 0,
			config TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}
	// Add strategy_type column if not exists (for migration)
	_, _ = s.db.Exec(`ALTER TABLE tactics ADD COLUMN strategy_type TEXT DEFAULT 'sonnet'`)
	_, _ = s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_tactics_user_id ON tactics(user_id)`)
	_, _ = s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_tactics_is_active ON tactics(is_active)`)
	_, _ = s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_tactics_strategy_type ON tactics(strategy_type)`)
	_, err = s.db.Exec(`
		CREATE TRIGGER IF NOT EXISTS update_tactics_updated_at
		AFTER UPDATE ON tactics
		BEGIN
			UPDATE tactics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
		END
	`)
	return err
}

func (s *TacticStore) initDefaultData() error {
	return nil
}

func (s *TacticStore) Create(tactic *Tactic) error {
	// Default to 'sonnet' if no strategy type specified
	strategyType := tactic.StrategyType
	if strategyType == "" {
		strategyType = "sonnet"
	}
	_, err := s.db.Exec(`
		INSERT INTO tactics (id, user_id, name, description, strategy_type, is_active, is_default, config)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, tactic.ID, tactic.UserID, tactic.Name, tactic.Description, strategyType, tactic.IsActive, tactic.IsDefault, tactic.Config)
	return err
}

func (s *TacticStore) Update(tactic *Tactic) error {
	_, err := s.db.Exec(`
		UPDATE tactics SET
			name = ?, description = ?, strategy_type = ?, config = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND user_id = ?
	`, tactic.Name, tactic.Description, tactic.StrategyType, tactic.Config, tactic.ID, tactic.UserID)
	return err
}

func (s *TacticStore) Delete(userID, id string) error {
	var isDefault bool
	s.db.QueryRow(`SELECT is_default FROM tactics WHERE id = ?`, id).Scan(&isDefault)
	if isDefault {
		return fmt.Errorf("cannot delete system default tactic")
	}
	_, err := s.db.Exec(`DELETE FROM tactics WHERE id = ? AND user_id = ?`, id, userID)
	return err
}

func (s *TacticStore) List(userID string) ([]*Tactic, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, name, description, COALESCE(strategy_type, 'sonnet'), is_active, is_default, config, created_at, updated_at
		FROM tactics
		WHERE user_id = ? OR is_default = 1
		ORDER BY is_default DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tactics []*Tactic
	for rows.Next() {
		var st Tactic
		var createdAt, updatedAt string
		err := rows.Scan(&st.ID, &st.UserID, &st.Name, &st.Description, &st.StrategyType, &st.IsActive, &st.IsDefault, &st.Config, &createdAt, &updatedAt)
		if err != nil {
			return nil, err
		}
		st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
		tactics = append(tactics, &st)
	}
	return tactics, nil
}

func (s *TacticStore) Get(userID, id string) (*Tactic, error) {
	var st Tactic
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, COALESCE(strategy_type, 'sonnet'), is_active, is_default, config, created_at, updated_at
		FROM tactics
		WHERE id = ? AND (user_id = ? OR is_default = 1)
	`, id, userID).Scan(&st.ID, &st.UserID, &st.Name, &st.Description, &st.StrategyType, &st.IsActive, &st.IsDefault, &st.Config, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

func (s *TacticStore) GetActive(userID string) (*Tactic, error) {
	var st Tactic
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, COALESCE(strategy_type, 'sonnet'), is_active, is_default, config, created_at, updated_at
		FROM tactics
		WHERE user_id = ? AND is_active = 1
	`, userID).Scan(&st.ID, &st.UserID, &st.Name, &st.Description, &st.StrategyType, &st.IsActive, &st.IsDefault, &st.Config, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return s.GetDefault()
	}
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

func (s *TacticStore) GetDefault() (*Tactic, error) {
	var st Tactic
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, COALESCE(strategy_type, 'sonnet'), is_active, is_default, config, created_at, updated_at
		FROM tactics
		WHERE is_default = 1
		LIMIT 1
	`).Scan(&st.ID, &st.UserID, &st.Name, &st.Description, &st.StrategyType, &st.IsActive, &st.IsDefault, &st.Config, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

// SetActive toggle active state of a tactic (allows multiple active tactics)
// Each category (opus, sonnet, current, cursor) can have multiple active tactics
func (s *TacticStore) SetActive(userID, tacticID string) error {
	// Get current active state
	var isActive bool
	err := s.db.QueryRow(`SELECT is_active FROM tactics WHERE id = ? AND (user_id = ? OR is_default = 1)`, tacticID, userID).Scan(&isActive)
	if err != nil {
		return fmt.Errorf("failed to get tactic: %w", err)
	}

	// Toggle the active state
	newState := !isActive
	_, err = s.db.Exec(`UPDATE tactics SET is_active = ? WHERE id = ? AND (user_id = ? OR is_default = 1)`, newState, tacticID, userID)
	if err != nil {
		return fmt.Errorf("failed to toggle tactic: %w", err)
	}

	return nil
}

// Deactivate deactivate a specific tactic
func (s *TacticStore) Deactivate(userID, tacticID string) error {
	_, err := s.db.Exec(`UPDATE tactics SET is_active = 0 WHERE id = ? AND (user_id = ? OR is_default = 1)`, tacticID, userID)
	return err
}

func (s *TacticStore) Duplicate(userID, sourceID, newID, newName string) error {
	source, err := s.Get(userID, sourceID)
	if err != nil {
		return fmt.Errorf("failed to get source tactic: %w", err)
	}
	newTactic := &Tactic{
		ID:          newID,
		UserID:      userID,
		Name:        newName,
		Description: "Created based on [" + source.Name + "]",
		IsActive:    false,
		IsDefault:   false,
		Config:      source.Config,
	}
	return s.Create(newTactic)
}

func (s *Tactic) ParseConfig() (*TacticConfig, error) {
	var config TacticConfig
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		return nil, fmt.Errorf("failed to parse tactic configuration: %w", err)
	}
	return &config, nil
}

func (s *Tactic) SetConfig(config *TacticConfig) error {
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to serialize tactic configuration: %w", err)
	}
	s.Config = string(data)
	return nil
}

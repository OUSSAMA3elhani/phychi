-- =============================================================================
-- PhyChi - Schema de base de donnees MySQL (Compatible GoDaddy Node.js Hosting)
-- =============================================================================

-- =============================================================================
-- TABLES SYSTEME & UTILISATEURS
-- =============================================================================

-- Comptes utilisateurs -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`           VARCHAR(100)  NOT NULL,
  `prenom`        VARCHAR(100)  NOT NULL,
  `email`         VARCHAR(255)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `niveau`        ENUM('l1','l2','l3','master','autre') NOT NULL DEFAULT 'autre',
  `role`          ENUM('user','admin') NOT NULL DEFAULT 'user',
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages de contact ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contacts` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`        VARCHAR(150)  NOT NULL,
  `email`      VARCHAR(255)  NOT NULL,
  `sujet`      ENUM('question','erreur','suggestion','technique','autre') NOT NULL DEFAULT 'autre',
  `message`    TEXT          NOT NULL,
  `statut`     ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `ip`         VARCHAR(45)   NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contacts_statut_date` (`statut`, `created_at`),
  KEY `idx_contacts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Favoris utilisateur (polymorphe : cours OU exercice) -----------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED NOT NULL,
  `item_type`    ENUM('course','exercise') NULL,
  `item_id`      INT UNSIGNED NULL,
  `titre`        VARCHAR(255)  NULL,
  `url`          VARCHAR(500)  NULL,
  `categorie`    ENUM('cours','exercices','autre') NOT NULL DEFAULT 'autre',
  `matiere`      ENUM('physique','chimie','autre') NOT NULL DEFAULT 'autre',
  `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorites_item` (`user_id`, `item_type`, `item_id`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions Express ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `expires`    INT UNSIGNED NOT NULL,
  `data`       MEDIUMTEXT   NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLES DE CONTENU PEDAGOGIQUE
-- =============================================================================

-- Disciplines (Physique, Chimie) ---------------------------------------------
CREATE TABLE IF NOT EXISTS `disciplines` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`         VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(100) NOT NULL,
  `description` TEXT         NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_disciplines_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chapitres ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chapters` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `discipline_id` INT UNSIGNED NOT NULL,
  `titre`         VARCHAR(255) NOT NULL,
  `slug`          VARCHAR(255) NOT NULL,
  `description`   TEXT         NULL,
  `tome`          VARCHAR(150) NULL,
  `niveau`        ENUM('l1','l2','l3','master','autre') NOT NULL DEFAULT 'l1',
  `ordre`         INT UNSIGNED NOT NULL DEFAULT 1,
  `order_num`     INT NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chapters_slug` (`slug`),
  KEY `idx_chapters_order` (`discipline_id`, `order_num`),
  CONSTRAINT `fk_chapters_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `disciplines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cours (Fiches de cours avec fichier integre) -------------------------------
CREATE TABLE IF NOT EXISTS `courses` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chapter_id`  INT UNSIGNED NOT NULL,
  `titre`       VARCHAR(255) NOT NULL,
  `slug`        VARCHAR(255) NOT NULL,
  `description` TEXT         NULL,
  `contenu`     LONGTEXT     NULL,
  `course_file` VARCHAR(500) NULL,
  `niveau`      ENUM('l1','l2','l3','master','autre') NOT NULL DEFAULT 'l1',
  `order_num`   INT NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_slug` (`slug`),
  KEY `idx_courses_order` (`chapter_id`, `order_num`),
  CONSTRAINT `fk_courses_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercices (avec fichiers enonce et correction integres) --------------------
CREATE TABLE IF NOT EXISTS `exercises` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chapter_id`      INT UNSIGNED NOT NULL,
  `course_id`       INT UNSIGNED NULL,
  `partie_cours`    VARCHAR(255) NULL,
  `titre`           VARCHAR(255) NOT NULL,
  `slug`            VARCHAR(255) NOT NULL,
  `description`     TEXT         NULL,
  `enonce_file`     VARCHAR(500) NULL,
  `correction_file` VARCHAR(500) NULL,
  `niveau`          ENUM('l1','l2','l3','master','autre') NOT NULL DEFAULT 'l1',
  `difficulte`      ENUM('facile','moyen','difficile','avance') NOT NULL DEFAULT 'moyen',
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exercises_slug` (`slug`),
  CONSTRAINT `fk_exercises_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exercises_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demandes de telechargement --------------------------------------------------
CREATE TABLE IF NOT EXISTS `download_requests` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `item_type`  ENUM('course','exercise') NOT NULL,
  `item_id`    INT UNSIGNED NOT NULL,
  `status`     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Concours & Annales (Sujets + Corriges associes) -----------------------------
CREATE TABLE IF NOT EXISTS `concours` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ecole`           VARCHAR(255) NOT NULL,
  `annee`           INT UNSIGNED NOT NULL,
  `filiere`         VARCHAR(100) NOT NULL DEFAULT 'Toutes',
  `matiere`         VARCHAR(100) NOT NULL DEFAULT 'Physique',
  `epreuve`         VARCHAR(255) NOT NULL,
  `titre`           VARCHAR(255) NOT NULL,
  `slug`            VARCHAR(255) NOT NULL,
  `enonce_file`     VARCHAR(500) NULL,
  `correction_file` VARCHAR(500) NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_concours_slug` (`slug`),
  KEY `idx_concours_ecole_annee` (`ecole`, `annee`),
  KEY `idx_concours_filiere` (`filiere`),
  KEY `idx_concours_matiere` (`matiere`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DONNEES INITIALES (SEED)
-- =============================================================================

INSERT IGNORE INTO `disciplines` (`id`, `nom`, `slug`, `description`) VALUES
(1, 'Physique', 'physique', 'Mecanique, thermodynamique, electromagnetisme et physique quantique.'),
(2, 'Chimie', 'chimie', 'Chimie organique, cinetique chimique, thermodynamique et solutions aquatiques.');

INSERT IGNORE INTO `chapters` (`id`, `discipline_id`, `titre`, `slug`, `description`, `niveau`, `ordre`, `order_num`) VALUES
(1, 1, 'Mecanique du Point et du Solide', 'mecanique-point-solide', 'Cinematique, dynamique newtonienne, energetique et oscillateurs mecaniques.', 'l1', 1, 1),
(2, 1, 'Thermodynamique Statistique & Macroscopique', 'thermodynamique', 'Principes de la thermodynamique, machines thermiques et entropie.', 'l2', 2, 2),
(3, 1, 'Electromagnetisme dans le vide & les milieux', 'electromagnetisme', 'Equations de Maxwell, ondes electromagnetiques et induction.', 'l2', 3, 3),
(4, 2, 'Cinetique Chimique & Catalyse', 'cinetique-chimique', 'Vitesses de reaction, lois d ordre et cinetique enzymatique.', 'l1', 1, 1),
(5, 2, 'Chimie Organique : Mecanismes & Stereochimie', 'chimie-organique', 'Substitution nucleophile, elimination, addition et stereochimie.', 'l2', 2, 2);

INSERT IGNORE INTO `courses` (`id`, `chapter_id`, `titre`, `slug`, `description`, `contenu`, `course_file`, `niveau`, `order_num`) VALUES
(1, 1, 'Cinematique du point materiel', 'cinematique-point', 'Vecteurs position, vitesse, acceleration en coordonnees cartesiennes et cylindriques.', 'Contenu detaille du cours de cinematique...', '/assets/downloads/fiches-mecanique.pdf', 'l1', 1),
(2, 1, 'Oscillateurs mecaniques amortis et forces', 'oscillateurs-mecaniques', 'Etude du regime harmonique, facteur de qualite et resonance.', 'Contenu detaille des oscillateurs...', '/assets/downloads/fiches-mecanique.pdf', 'l1', 2),
(3, 2, 'Les deux premiers principes de la thermodynamique', 'principes-thermodynamique', 'Bilan d energie, enthalpie, entropie et machines de Carnot.', 'Contenu detaille de thermodynamique...', '/assets/downloads/formulaire-thermo.pdf', 'l2', 3),
(4, 4, 'Lois d ordre et mecanismes reactionnels', 'lois-ordre-cinetique', 'Determination des ordres de reaction et vitesse initiale.', 'Contenu detaille de cinetique...', '/assets/downloads/tp-cinetique-spectro.pdf', 'l1', 4),
(5, 5, 'Substitutions nucleophiles SN1 et SN2', 'sn1-sn2-organique', 'Cinematique, stereochimie et facteurs influencant la vitesse.', 'Contenu detaille de chimie organique...', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2', 5);

INSERT IGNORE INTO `exercises` (`id`, `chapter_id`, `titre`, `slug`, `description`, `enonce_file`, `correction_file`, `niveau`, `difficulte`) VALUES
(1, 1, 'Serie 1 : Oscillateur harmonique amorti et force', 'exo-oscillateur-amorti', 'Etude des regimes transitoires et permanents, resonance en amplitude.', '/assets/downloads/fiches-mecanique.pdf', '/assets/downloads/fiches-mecanique.pdf', 'l1', 'moyen'),
(2, 1, 'Serie 2 : Mouvement dans un champ de force centrale', 'exo-force-centrale', 'Lois de Kepler, potentiel effectif et trajectoires orbitales.', '/assets/downloads/fiches-mecanique.pdf', '/assets/downloads/fiches-mecanique.pdf', 'l2', 'difficile'),
(3, 2, 'Serie 1 : Cycle de Carnot et rendement thermique', 'exo-cycle-carnot', 'Calcul des transferts thermiques Q et travaux W sur un cycle thermodynamique.', '/assets/downloads/formulaire-thermo.pdf', '/assets/downloads/formulaire-thermo.pdf', 'l2', 'moyen'),
(4, 4, 'Serie 1 : Determination experimentale d un ordre de reaction', 'exo-ordre-reaction', 'Methode differentielle et methode des temps de demi-reaction.', '/assets/downloads/tp-cinetique-spectro.pdf', '/assets/downloads/tp-cinetique-spectro.pdf', 'l1', 'facile'),
(5, 5, 'Serie 3 : Substitution nucleophile et elimination', 'exo-sn-e-organique', 'Competition entre SN1, SN2, E1 et E2 selon le substrat et le solvant.', '/assets/downloads/fiches-orga-mecanismes.pdf', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2', 'moyen');

INSERT IGNORE INTO `users` (`id`, `nom`, `prenom`, `email`, `password_hash`, `niveau`, `role`) VALUES
(1, 'EL HANI', 'Oussama', 'admin@phychemia.com', '$2b$12$GLzM1NKpjMZ/g.bsCQZXluRzbIGzGgiCI5badV4EB0Ohqz3f8wYI.', 'master', 'admin');

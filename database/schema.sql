-- =============================================================================
-- PhyChi - schema de base de donnees MySQL (Mis a jour avec fichiers directement sur Cours & Exercices)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `phychi`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `phychi`;

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

-- Ajustement du champ role si la table existait deja
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `role` ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER `niveau`;

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
--
-- `item_type` + `item_id` designent la ressource favorite. Les colonnes
-- `titre` / `url` / `categorie` / `matiere` restent presentes et denormalisees :
-- elles servent de repli d'affichage et gardent l'ancienne API fonctionnelle.
-- Elles sont devenues NULL-ables car un favori polymorphe tire son libelle de
-- la table `courses` / `exercises` par jointure.
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

-- Migration des installations anterieures ------------------------------------
-- L'ordre importe : la nouvelle cle unique doit exister AVANT la suppression de
-- l'ancienne, sinon MariaDB refuse le DROP (plus aucun index ne couvrirait la
-- cle etrangere `fk_favorites_user`, erreur 150).
ALTER TABLE `favorites` ADD COLUMN IF NOT EXISTS `item_type` ENUM('course','exercise') NULL AFTER `user_id`;
ALTER TABLE `favorites` ADD COLUMN IF NOT EXISTS `item_id` INT UNSIGNED NULL AFTER `item_type`;
ALTER TABLE `favorites` MODIFY COLUMN `titre` VARCHAR(255) NULL;
ALTER TABLE `favorites` MODIFY COLUMN `url` VARCHAR(500) NULL;
ALTER TABLE `favorites` ADD UNIQUE KEY IF NOT EXISTS `uq_favorites_item` (`user_id`, `item_type`, `item_id`);
ALTER TABLE `favorites` DROP INDEX IF EXISTS `uq_favorites_user_titre`;

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
  `niveau`        ENUM('l1','l2','l3','master','autre') NOT NULL DEFAULT 'l1',
  `ordre`         INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chapters_slug` (`slug`),
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
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_slug` (`slug`),
  CONSTRAINT `fk_courses_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `courses` ADD COLUMN IF NOT EXISTS `course_file` VARCHAR(500) NULL AFTER `contenu`;

-- Exercices (avec fichiers enonce et correction integres) --------------------
CREATE TABLE IF NOT EXISTS `exercises` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chapter_id`      INT UNSIGNED NOT NULL,
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
  CONSTRAINT `fk_exercises_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `exercises` ADD COLUMN IF NOT EXISTS `enonce_file` VARCHAR(500) NULL AFTER `description`;
ALTER TABLE `exercises` ADD COLUMN IF NOT EXISTS `correction_file` VARCHAR(500) NULL AFTER `enonce_file`;

-- Ordre d'affichage public ---------------------------------------------------
--
-- `chapters` possedait deja une colonne `ordre` qui remplissait ce role.
-- `order_num` est ajoute pour uniformiser le nommage entre `chapters` et
-- `courses` ; les valeurs existantes de `ordre` sont reprises pour ne pas
-- perdre le classement en place, et l'administration ecrit desormais les deux
-- colonnes en parallele. `ordre` est conserve (aucune suppression destructrice)
-- mais devient redondant.
ALTER TABLE `chapters` ADD COLUMN IF NOT EXISTS `order_num` INT NOT NULL DEFAULT 0 AFTER `ordre`;
ALTER TABLE `courses`  ADD COLUMN IF NOT EXISTS `order_num` INT NOT NULL DEFAULT 0 AFTER `niveau`;

-- Reprise unique : ne reecrit que les lignes encore a la valeur par defaut.
UPDATE `chapters` SET `order_num` = `ordre` WHERE `order_num` = 0;

CREATE INDEX IF NOT EXISTS `idx_chapters_order` ON `chapters` (`discipline_id`, `order_num`);
CREATE INDEX IF NOT EXISTS `idx_courses_order`  ON `courses`  (`chapter_id`, `order_num`);

-- Demandes de telechargement --------------------------------------------------
--
-- Un utilisateur demande l'acces a un document ; un administrateur approuve ou
-- refuse. La cle unique rend la demande idempotente : re-cliquer ne cree pas de
-- doublon. Comme `favorites`, la cible est polymorphe (cours ou exercice) et
-- ne porte donc pas de cle etrangere sur `item_id`.
CREATE TABLE IF NOT EXISTS `download_requests` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `item_type`  ENUM('course','exercise') NOT NULL,
  `item_id`    INT UNSIGNED NOT NULL,
  `status`     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_download_requests_item` (`user_id`, `item_type`, `item_id`),
  KEY `idx_download_requests_status` (`status`, `created_at`),
  CONSTRAINT `fk_download_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppression des anciennes tables inutiles si presentes ---------------------
DROP TABLE IF EXISTS `solutions`;
DROP TABLE IF EXISTS `downloads`;

-- =============================================================================
-- DONNEES DE SEED
-- =============================================================================
--
-- ATTENTION : ce script est rejouable, mais les jeux de demonstration
-- ci-dessous (chapitres, cours, exercices) sont GARDES par un test
-- `WHERE NOT EXISTS`. Sans ce garde-fou, relancer `npm run db:init` sur une
-- base en production ressusciterait le contenu de demonstration qu'un
-- administrateur aurait supprime. Les disciplines et le compte admin restent
-- eux idempotents (ON DUPLICATE KEY), car ce sont des references stables.

INSERT INTO `disciplines` (`id`, `nom`, `slug`, `description`) VALUES
(1, 'Physique', 'physique', 'Mecanique, thermodynamique, electromagnetisme et physique quantique.'),
(2, 'Chimie', 'chimie', 'Chimie organique, cinetique chimique, thermodynamique et solutions aquatiques.')
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`);

INSERT INTO `chapters` (`id`, `discipline_id`, `titre`, `slug`, `description`, `niveau`, `ordre`)
SELECT * FROM (
  SELECT 1 AS `id`, 1 AS `discipline_id`, 'Mecanique du Point et du Solide' AS `titre`, 'mecanique-point-solide' AS `slug`, 'Cinematique, dynamique newtonienne, energetique et oscillateurs mecaniques.' AS `description`, 'l1' AS `niveau`, 1 AS `ordre`
  UNION ALL
  SELECT 2, 1, 'Thermodynamique Statistique & Macroscopique', 'thermodynamique', 'Principes de la thermodynamique, machines thermiques et entropie.', 'l2', 2
  UNION ALL
  SELECT 3, 1, 'Electromagnetisme dans le vide & les milieux', 'electromagnetisme', 'Equations de Maxwell, ondes electromagnetiques et induction.', 'l2', 3
  UNION ALL
  SELECT 4, 2, 'Cinetique Chimique & Catalyse', 'cinetique-chimique', 'Vitesses de reaction, lois d ordre et cinetique enzymatique.', 'l1', 1
  UNION ALL
  SELECT 5, 2, 'Chimie Organique : Mecanismes & Stereochimie', 'chimie-organique', 'Substitution nucleophile, elimination, addition et stereochimie.', 'l2', 2
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `chapters` LIMIT 1);

INSERT INTO `courses` (`id`, `chapter_id`, `titre`, `slug`, `description`, `contenu`, `course_file`, `niveau`)
SELECT * FROM (
  SELECT 1 AS `id`, 1 AS `chapter_id`, 'Cinematique du point materiel' AS `titre`, 'cinematique-point' AS `slug`, 'Vecteurs position, vitesse, acceleration en coordonnees cartesiennes et cylindriques.' AS `description`, 'Contenu detaille du cours de cinematique...' AS `contenu`, '/assets/downloads/fiches-mecanique.pdf' AS `course_file`, 'l1' AS `niveau`
  UNION ALL
  SELECT 2, 1, 'Oscillateurs mecaniques amortis et forces', 'oscillateurs-mecaniques', 'Etude du regime harmonique, facteur de qualite et resonance.', 'Contenu detaille des oscillateurs...', '/assets/downloads/fiches-mecanique.pdf', 'l1'
  UNION ALL
  SELECT 3, 2, 'Les deux premiers principes de la thermodynamique', 'principes-thermodynamique', 'Bilan d energie, enthalpie, entropie et machines de Carnot.', 'Contenu detaille de thermodynamique...', '/assets/downloads/formulaire-thermo.pdf', 'l2'
  UNION ALL
  SELECT 4, 4, 'Lois d ordre et mecanismes reactionnels', 'lois-ordre-cinetique', 'Determination des ordres de reaction et vitesse initiale.', 'Contenu detaille de cinetique...', '/assets/downloads/tp-cinetique-spectro.pdf', 'l1'
  UNION ALL
  SELECT 5, 5, 'Substitutions nucleophiles SN1 et SN2', 'sn1-sn2-organique', 'Cinematique, stereochimie et facteurs influencant la vitesse.', 'Contenu detaille de chimie organique...', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `courses` LIMIT 1);

INSERT INTO `exercises` (`id`, `chapter_id`, `titre`, `slug`, `description`, `enonce_file`, `correction_file`, `niveau`, `difficulte`)
SELECT * FROM (
  SELECT 1 AS `id`, 1 AS `chapter_id`, 'Serie 1 : Oscillateur harmonique amorti et force' AS `titre`, 'exo-oscillateur-amorti' AS `slug`, 'Etude des regimes transitoires et permanents, resonance en amplitude.' AS `description`, '/assets/downloads/fiches-mecanique.pdf' AS `enonce_file`, '/assets/downloads/fiches-mecanique.pdf' AS `correction_file`, 'l1' AS `niveau`, 'moyen' AS `difficulte`
  UNION ALL
  SELECT 2, 1, 'Serie 2 : Mouvement dans un champ de force centrale', 'exo-force-centrale', 'Lois de Kepler, potentiel effectif et trajectoires orbitales.', '/assets/downloads/fiches-mecanique.pdf', '/assets/downloads/fiches-mecanique.pdf', 'l2', 'difficile'
  UNION ALL
  SELECT 3, 2, 'Serie 1 : Cycle de Carnot et rendement thermique', 'exo-cycle-carnot', 'Calcul des transferts thermiques Q et travaux W sur un cycle thermodynamique.', '/assets/downloads/formulaire-thermo.pdf', '/assets/downloads/formulaire-thermo.pdf', 'l2', 'moyen'
  UNION ALL
  SELECT 4, 4, 'Serie 1 : Determination experimentale d un ordre de reaction', 'exo-ordre-reaction', 'Methode differentielle et methode des temps de demi-reaction.', '/assets/downloads/tp-cinetique-spectro.pdf', '/assets/downloads/tp-cinetique-spectro.pdf', 'l1', 'facile'
  UNION ALL
  SELECT 5, 5, 'Serie 3 : Substitution nucleophile et elimination', 'exo-sn-e-organique', 'Competition entre SN1, SN2, E1 et E2 selon le substrat et le solvant.', '/assets/downloads/fiches-orga-mecanismes.pdf', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2', 'moyen'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `exercises` LIMIT 1);

INSERT INTO `users` (`nom`, `prenom`, `email`, `password_hash`, `niveau`, `role`) VALUES
('Admin', 'PhyChi', 'admin@phychi.com', '$2b$12$89vqE4FPsIPSTFM8Tfm8z.H5VKFbIbDxRmH7llcg1UUaKMNHvQBWW', 'master', 'admin')
ON DUPLICATE KEY UPDATE `role` = 'admin';

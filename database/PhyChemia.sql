-- Database export for PhyChemia
-- Updated: 2026-08-12

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table: disciplines
DROP TABLE IF EXISTS `disciplines`;
CREATE TABLE `disciplines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_disciplines_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `disciplines` (`id`, `nom`, `slug`, `description`, `created_at`) VALUES
(1, 'Physique', 'physique', 'Mecanique, thermodynamique, electromagnetisme et physique quantique.', '2026-08-09 21:36:23'),
(2, 'Chimie', 'chimie', 'Chimie organique, cinetique chimique, thermodynamique et solutions aquatiques.', '2026-08-09 21:36:23');

-- 2. Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `niveau` enum('l1','l2','l3','master','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'autre',
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `nom`, `prenom`, `email`, `password_hash`, `niveau`, `role`, `created_at`, `updated_at`) VALUES
(1, 'EL HANI', 'Oussama', 'admin@phychemia.com', '$2b$12$GLzM1NKpjMZ/g.bsCQZXluRzbIGzGgiCI5badV4EB0Ohqz3f8wYI.', 'master', 'admin', '2026-08-09 21:36:23', '2026-08-09 21:36:23'),
(2, 'ELHANI', 'OUSSAMA', 'oussamaelhani3@gmail.com', '$2b$12$NR9M9gQmxbW3ZD.yVfjeWO9hlQ77qUwyh9A24dNjUKmZVlMPHlRlG', 'master', 'user', '2026-08-09 21:51:38', '2026-08-09 21:51:38'),
(3, 'Arabi', 'Admin', 'arabi@phychemia.com', '$2b$10$mgmLFZs.h3SKpx352F8vteFZM6C26JWl2qLqXo5zDxfUJ9zeaWx4e', 'master', 'admin', '2026-08-12 04:33:00', '2026-08-12 04:33:00');

-- 3. Table: chapters
DROP TABLE IF EXISTS `chapters`;
CREATE TABLE `chapters` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `discipline_id` int unsigned NOT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `tome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `niveau` enum('l1','l2','l3','master','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'l1',
  `ordre` int unsigned NOT NULL DEFAULT '1',
  `order_num` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chapters_slug` (`slug`),
  KEY `idx_chapters_order` (`discipline_id`,`order_num`),
  CONSTRAINT `fk_chapters_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `disciplines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `chapters` (`id`, `discipline_id`, `titre`, `slug`, `description`, `niveau`, `ordre`, `order_num`, `created_at`) VALUES
(2, 1, 'Thermodynamique Statistique & Macroscopique', 'thermodynamique', 'Principes de la thermodynamique, machines thermiques et entropie.', 'l2', 2, 2, '2026-08-09 21:36:23'),
(3, 1, 'Electromagnetisme dans le vide & les milieux', 'electromagnetisme', 'Equations de Maxwell, ondes electromagnetiques et induction.', 'l2', 3, 3, '2026-08-09 21:36:23'),
(5, 2, 'Chimie Organique : Mecanismes & Stereochimie', 'chimie-organique', 'Substitution nucleophile, elimination, addition et stereochimie.', 'l2', 2, 2, '2026-08-09 21:36:23'),
(6, 1, 'Mecanique du Point', 'mecanique-du-point', 'Cinematique, dynamique newtonienne, energetique et oscillateurs mecaniques.', 'l1', 1, 1, '2026-08-10 13:55:41'),
(7, 1, 'Mecanique du Solide', 'mecanique-du-solide', 'torseurs, Cinematique, dynamique, energetique et oscillateurs mecaniques.', 'l2', 1, 1, '2026-08-10 13:56:57'),
(8, 1, 'Thermodynamique 1', 'thermodynamique-1', 'Principes de la thermodynamique, machines thermiques et entropie.', 'l1', 1, 1, '2026-08-10 13:58:42'),
(9, 1, 'Electromagnetisme dans le vide', 'electromagnetisme-dans-le-vide', 'magnétostatique, Equations de Maxwell, ondes electromagnetiques et induction.', 'l1', 1, 1, '2026-08-10 13:59:49'),
(13, 2, 'Cinetique Chimique', 'cinetique-chimique', 'Vitesses de reaction, lois d ordre, mécanisme reactionnel', 'l2', 1, 1, '2026-08-10 14:04:27');

-- 4. Table: courses
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `chapter_id` int unsigned NOT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `contenu` longtext COLLATE utf8mb4_unicode_ci,
  `course_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `niveau` enum('l1','l2','l3','master','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'l1',
  `order_num` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_slug` (`slug`),
  KEY `idx_courses_order` (`chapter_id`,`order_num`),
  CONSTRAINT `fk_courses_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `courses` (`id`, `chapter_id`, `titre`, `slug`, `description`, `contenu`, `course_file`, `niveau`, `order_num`, `created_at`) VALUES
(3, 8, 'premiers principes de la thermodynamique', 'premiers-principes-de-la-thermodynamique', 'Bilan d energie, enthalpie, entropie et machines de Carnot.', NULL, '/assets/downloads/formulaire-thermo.pdf', 'l2', 2, '2026-08-09 21:36:23'),
(5, 5, 'Substitutions nucleophiles SN1 et SN2', 'sn1-sn2-organique', 'Cinematique, stereochimie et facteurs influencant la vitesse.', 'Contenu detaille de chimie organique...', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2', 5, '2026-08-09 21:36:23'),
(6, 6, 'Cinematique', 'cinematique', NULL, NULL, NULL, 'l1', 1, '2026-08-10 14:06:45');

-- 5. Table: exercises
DROP TABLE IF EXISTS `exercises`;
CREATE TABLE `exercises` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `chapter_id` int unsigned NOT NULL,
  `course_id` int unsigned DEFAULT NULL,
  `partie_cours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `enonce_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correction_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `niveau` enum('l1','l2','l3','master','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'l1',
  `difficulte` enum('facile','moyen','difficile','avance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moyen',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exercises_slug` (`slug`),
  KEY `fk_exercises_chapter` (`chapter_id`),
  KEY `fk_exercises_course` (`course_id`),
  CONSTRAINT `fk_exercises_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exercises_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `exercises` (`id`, `chapter_id`, `titre`, `slug`, `description`, `enonce_file`, `correction_file`, `niveau`, `difficulte`, `created_at`) VALUES
(3, 2, 'Serie 1 : Cycle de Carnot et rendement thermique', 'exo-cycle-carnot', 'Calcul des transferts thermiques Q et travaux W sur un cycle thermodynamique.', '/assets/downloads/formulaire-thermo.pdf', '/assets/downloads/formulaire-thermo.pdf', 'l2', 'moyen', '2026-08-09 21:36:23'),
(5, 5, 'Serie 3 : Substitution nucleophile et elimination', 'exo-sn-e-organique', 'Competition entre SN1, SN2, E1 et E2 selon le substrat et le solvant.', '/assets/downloads/fiches-orga-mecanismes.pdf', '/assets/downloads/fiches-orga-mecanismes.pdf', 'l2', 'moyen', '2026-08-09 21:36:23');

-- 6. Table: download_requests
DROP TABLE IF EXISTS `download_requests`;
CREATE TABLE `download_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `item_type` enum('course','exercise') COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_id` int unsigned NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_download_requests_item` (`user_id`,`item_type`,`item_id`),
  KEY `idx_download_requests_status` (`status`,`created_at`),
  CONSTRAINT `fk_download_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `download_requests` (`id`, `user_id`, `item_type`, `item_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'course', 1, 'approved', '2026-08-09 22:16:24', '2026-08-09 22:16:41'),
(2, 1, 'course', 2, 'approved', '2026-08-10 00:04:43', '2026-08-10 00:05:07');

-- 6b. Table: concours
DROP TABLE IF EXISTS `concours`;
CREATE TABLE `concours` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ecole` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `annee` int unsigned NOT NULL,
  `filiere` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Toutes',
  `matiere` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Physique',
  `epreuve` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enonce_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correction_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_concours_slug` (`slug`),
  KEY `idx_concours_ecole_annee` (`ecole`,`annee`),
  KEY `idx_concours_filiere` (`filiere`),
  KEY `idx_concours_matiere` (`matiere`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: favorites
DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `item_type` enum('course','exercise') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_id` int unsigned DEFAULT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categorie` enum('cours','exercices','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'autre',
  `matiere` enum('physique','chimie','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'autre',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorites_item` (`user_id`,`item_type`,`item_id`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: contacts
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sujet` enum('question','erreur','suggestion','technique','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'autre',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut` enum('nouveau','en_cours','traite') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nouveau',
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contacts_statut_date` (`statut`,`created_at`),
  KEY `idx_contacts_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `contacts` (`id`, `nom`, `email`, `sujet`, `message`, `statut`, `ip`, `created_at`) VALUES
(1, 'Albert', 'albertbrown8979@gmail.com', 'erreur', 'Hi,\r\n\r\nI was looking over your website and noticed a few specific areas where optimization could boost your Google rankings and attract higher-quality leads.\r\n\r\nI have put together a brief SEO strategy and pricing proposal designed to help scale your organic growth.\r\n\r\nWould you be open to reviewing it?\r\n\r\nBest regards,\r\n\r\nAlbert', 'nouveau', '223.233.70.82', '2026-08-11 02:33:58'),
(2, 'Manshi', 'manshis@vgroupinc.com', 'question', 'Hi,\r\n\r\nYour website phychemia.com really stood out to me. I can see some solid opportunities to build on what you already have and take things to the next level, both in terms of ROI and overall reach.\r\n\r\nWith over 25 years of experience, V Group specializes in scaling websites the right way, ensuring they\'re accessible and compliant so they reach the widest possible audience.\r\n\r\nWould you have some time this week to connect and explore this further?\r\n\r\nBest Regards,\r\nManshi Sharma', 'nouveau', '103.212.146.6', '2026-08-11 20:06:46'),
(3, 'Ananya', 'ananya@rocketdigitaltech.com', 'technique', 'Hello http://phychemia.com,\r\n\r\nWe can place your website on Google 1st page.\r\n\r\nI can give you our Complete SEO Action Plan along with a customary reach and add great value to your product/ service.\r\n\r\nI may send you a SEO Packages & price list. If interested.\r\n\r\nBest Regards,\r\nAnanya\r\nOnline SEO Consultant', 'nouveau', '119.252.192.169', '2026-08-11 21:10:49'),
(4, 'Manshi', 'manshis@vgroupinc.com', 'erreur', 'Hi,\r\n\r\nYour website phychemia.com really stood out to me. I can see some solid opportunities to build on what you already have and take things to the next level, both in terms of ROI and overall reach.\r\n\r\nWith over 25 years of experience, V Group specializes in scaling websites the right way, ensuring they\'re accessible and compliant so they reach the widest possible audience.\r\n\r\nWould you have some time this week to connect and explore this further?\r\n\r\nBest Regards,\r\nManshi Sharma', 'nouveau', '103.212.146.6', '2026-08-11 21:38:44'),
(5, 'Manshi', 'manshis@vgroupinc.com', 'erreur', 'Hi,\r\n\r\nYour website phychemia.com really stood out to me. I can see some solid opportunities to build on what you already have and take things to the next level, both in terms of ROI and overall reach.\r\n\r\nWith over 25 years of experience, V Group specializes in scaling websites the right way, ensuring they\'re accessible and compliant so they reach the widest possible audience.\r\n\r\nWould you have some time this week to connect and explore this further?\r\n\r\nBest Regards,\r\nManshi Sharma', 'nouveau', '103.212.146.6', '2026-08-11 22:55:32');

-- 9. Table: sessions
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('ZwZM3GKt0K8CsazSNCHfVcDWZ9zID-xs', 1786975732, '{"cookie":{"originalMaxAge":604800000,"expires":"2026-08-16T23:26:35.220Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":1,"email":"admin@phychemia.com"}');

SET FOREIGN_KEY_CHECKS = 1;
-- EXPORT COMPLETE

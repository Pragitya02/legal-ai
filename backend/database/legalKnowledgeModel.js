async function ensureLegalKnowledgeTable(pool) {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS legal_knowledge (
                id INT NOT NULL AUTO_INCREMENT,

                act_name VARCHAR(255) NOT NULL,
                act_number VARCHAR(50) DEFAULT NULL,
                section_number VARCHAR(50) DEFAULT NULL,
                section_title VARCHAR(500) DEFAULT NULL,

                content LONGTEXT NOT NULL,

                source_name VARCHAR(255) NOT NULL DEFAULT 'India Code',
                source_url TEXT DEFAULT NULL,

                effective_date DATE DEFAULT NULL,
                source_version VARCHAR(100) DEFAULT NULL,

                content_hash CHAR(64) DEFAULT NULL,

                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                INDEX idx_legal_act (act_name),
                INDEX idx_legal_section (act_name, section_number),
                INDEX idx_legal_title (section_title),

                UNIQUE KEY uq_legal_section (
                    act_name,
                    section_number
                )
            )
        `);

        /*
         * Add FULLTEXT search to the existing table.
         *
         * This is checked through information_schema so the
         * index is created only once.
         */
        const [indexes] = await pool.query(`
            SELECT COUNT(*) AS count
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'legal_knowledge'
              AND index_name = 'ft_legal_knowledge'
        `);

        if (indexes[0].count === 0) {

            await pool.query(`
                ALTER TABLE legal_knowledge
                ADD FULLTEXT INDEX ft_legal_knowledge (
                    section_title,
                    content
                )
            `);

            console.log(
                "LEGAL KNOWLEDGE FULLTEXT INDEX CREATED"
            );

        } else {

            console.log(
                "LEGAL KNOWLEDGE FULLTEXT INDEX READY"
            );
        }

        console.log(
            "LEGAL KNOWLEDGE TABLE READY"
        );

    } catch (error) {

        console.error(
            "FAILED TO CREATE LEGAL KNOWLEDGE TABLE:",
            error.message
        );

    }
}

module.exports = {
    ensureLegalKnowledgeTable
};
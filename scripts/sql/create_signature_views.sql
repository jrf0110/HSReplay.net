CREATE VIEW all_signature_weights AS
	WITH all_signatures AS (
		SELECT
			ds.id AS signature_id,
			ds.archetype_id,
			ds.format,
			ds.as_of,
			row_number() OVER(PARTITION BY ds.archetype_id, ds.format ORDER BY ds.as_of DESC) AS signature_recency
		FROM decks_signature ds
	)
	SELECT
		s.signature_recency,
		s.archetype_id,
		a.name AS archetype_name,
		s.as_of,
		s.format,
		c.dbf_id,
		c.name AS card_name,
		sc.weight
	FROM all_signatures s
	JOIN cards_archetype a ON a.id = s.archetype_id
	JOIN decks_signaturecomponent sc ON sc.signature_id = s.signature_id
	JOIN card c ON c.dbf_id = sc.card_dbf_id;

CREATE VIEW current_signature_weights AS
SELECT
	s1.archetype_id,
	s1.archetype_name,
	s1.as_of,
	s1.format,
	s1.dbf_id,
	s1.card_name,
	s1.weight::decimal(6,4) AS current_weight,
	s2.weight::decimal(6,4) AS previous_weight,
	(s1.weight - s2.weight)::decimal(6,4) AS weight_delta
FROM all_signature_weights s1
FULL OUTER JOIN all_signature_weights s2 ON s1.archetype_id = s2.archetype_id AND s1.format = s2.format AND s1.dbf_id = s2.dbf_id
WHERE s1.signature_recency = 1
AND s2.signature_recency = 2;

-- EXAMPLE USAGE: Update the as_of timestamp filter to be the latest run of signature generation
-- SELECT *
-- FROM current_signature_weights
-- WHERE as_of >= '2017-08-01 06:55:00'
-- ORDER BY format DESC, archetype_id, current_weight DESC;

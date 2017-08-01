-- NOTE: The WILD card_set list must be updated when the Hearthstone Zodiac Year Changes.
-- Currently it is correct for Year Of The Mammoth
-- If minimum required number of validation decks or training decks changes the HAVING clause must also be updated

UPDATE cards_archetype SET active_in_standard = True WHERE id IN (
	WITH deck_format AS (
		SELECT
			i.deck_id,
			CASE
				WHEN sum(CASE WHEN c.card_set IN (12, 13, 14, 15, 20) THEN 1 ELSE 0 END) > 0
				THEN True
				ELSE False
			END AS is_wild
		FROM decks_archetypetrainingdeck t
		JOIN cards_include i ON i.deck_id = t.deck_id
		JOIN card c ON c.card_id = i.card_id
		GROUP BY i.deck_id
	)
	SELECT
		d.archetype_id
	FROM decks_archetypetrainingdeck t
	JOIN cards_deck d ON d.id = t.deck_id
	JOIN deck_format df ON df.deck_id = d.id
	JOIN cards_archetype a ON a.id = d.archetype_id
	GROUP BY d.archetype_id, a.name
	HAVING sum(CASE WHEN df.is_wild = False AND t.is_validation_deck THEN 1 ELSE 0 END) >= 1 AND sum(CASE WHEN df.is_wild = False AND t.is_validation_deck = False THEN 1 ELSE 0 END) >= 3
)

UPDATE cards_archetype SET active_in_wild = True WHERE id IN (
	WITH deck_format AS (
		SELECT
			i.deck_id,
			CASE
				WHEN sum(CASE WHEN c.card_set IN (12, 13, 14, 15, 20) THEN 1 ELSE 0 END) > 0
				THEN True
				ELSE False
			END AS is_wild
		FROM decks_archetypetrainingdeck t
		JOIN cards_include i ON i.deck_id = t.deck_id
		JOIN card c ON c.card_id = i.card_id
		GROUP BY i.deck_id
	)
	SELECT
		d.archetype_id
	FROM decks_archetypetrainingdeck t
	JOIN cards_deck d ON d.id = t.deck_id
	JOIN deck_format df ON df.deck_id = d.id
	JOIN cards_archetype a ON a.id = d.archetype_id
	GROUP BY d.archetype_id, a.name
	HAVING sum(CASE WHEN df.is_wild AND t.is_validation_deck THEN 1 ELSE 0 END) >= 1 AND sum(CASE WHEN df.is_wild AND t.is_validation_deck = False THEN 1 ELSE 0 END) >= 3
)

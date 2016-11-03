from collections import defaultdict
from django.core.cache import cache
from django.db import connection
from decimal import Decimal
from hsreplaynet.utils.db import dictfetchall
from hsreplaynet.utils.collections import defaultdict_to_vanilla_dict


WINRATES_BY_ARCHETYPE_QUERY = """
SELECT
friendly_arch.id,
max(friendly_arch.name) AS "friendly_arch_name",
opposing_arch.id,
max(opposing_arch.name) AS "opposing_arch_name",
sum(hth.matches) as "match_count",
sum(hth.friendly_player_wins) AS "friendly_wins",
round(((1.0 * sum(hth.friendly_player_wins)) / sum(hth.matches)) * 100, 2) AS f_wr_vs_o
FROM cards_archetype friendly_arch
JOIN cards_archetype opposing_arch ON TRUE
JOIN head_to_head_archetype_stats hth
	ON hth.friendly_player_archetype_id = friendly_arch.id
	AND hth.opposing_player_archetype_id = opposing_arch.id
WHERE hth.epoch_seconds > date_part('epoch', current_timestamp - interval '7 days')
AND game_type = 2
AND hth.rank BETWEEN -1 AND 15
-- The following two rows allow limiting the result set to certain archetypes
-- Both in clauses should contain the same set of IDs
-- AND friendly_arch.id IN (1, 2, 3, 5, 13)
-- AND opposing_arch.id IN (1, 2, 3, 5, 13)
GROUP BY friendly_arch.id, opposing_arch.id;
"""


def get_head_to_head_winrates_by_archetype_table():
	# Cache results for 1 hour (since that's the resolution that the trigger stores data at.
	# See Thundering Herd Protection
	# https://github.com/sebleier/django-redis-cache
	win_rates_table, archetype_frequencies, expected_winrates = cache.get_or_set(
		'archetype_winrates',
		_generate_win_rates_by_archetype_table_from_db,
		timeout=300
	)
	return win_rates_table, archetype_frequencies, expected_winrates

	pass


def _generate_win_rates_by_archetype_table_from_db():
	win_rates_table = defaultdict(lambda: defaultdict(dict))
	archetype_counts = defaultdict(int)
	total_matches = 0

	cursor = connection.cursor()
	cursor.execute(WINRATES_BY_ARCHETYPE_QUERY)

	for record in dictfetchall(cursor):

		if record["friendly_arch_name"] == record["opposing_arch_name"]:
			if record["f_wr_vs_o"] != Decimal(50.00):
				# Draws could cause this not to be 50%
				record["f_wr_vs_o"] = Decimal(50.00)

		total_matches += record["match_count"]
		archetype_counts[record["friendly_arch_name"]] += record["match_count"]

		head_to_head = win_rates_table[record["friendly_arch_name"]][record["opposing_arch_name"]]
		head_to_head["friendly_wins"] = record["friendly_wins"]
		head_to_head["match_count"] = record["match_count"]
		head_to_head["f_wr_vs_o"] = float(record["f_wr_vs_o"])

	win_rates_table = defaultdict_to_vanilla_dict(win_rates_table)

	# Consider calculating this from deck_summary_stats to get higher resolution than 1 day.
	# E.g. deck_summary_stats can give a distribution up to the hour
	# Pull the archetype win_rates from one function
	# And the archetype frequencies from another query
	# And merge them in python to generate the expected win rates
	archetype_frequencies = {
		a: ((1.0 * c) / total_matches) for a, c in archetype_counts.items()
	}

	sorted_archetypes = sorted(archetype_frequencies.keys())

	expected_winrates = {}
	for archetype in sorted_archetypes:
		expected_win_rate = 0.0
		archetype_win_rates_vs_opponents = win_rates_table[archetype]
		for opponent_archetype in sorted_archetypes:
			opponent_frequency = archetype_frequencies[opponent_archetype]
			if opponent_archetype in archetype_win_rates_vs_opponents:
				head_to_head_winrate = archetype_win_rates_vs_opponents[opponent_archetype]
				MIN_SAMPLE_CUTOFF = 10
				if head_to_head_winrate["match_count"] >= MIN_SAMPLE_CUTOFF:
					win_rate_for_match = float(head_to_head_winrate["f_wr_vs_o"])
					expected_win_rate += opponent_frequency * win_rate_for_match
				else:
					expected_win_rate += opponent_frequency * .5
			else:
				expected_win_rate += opponent_frequency * .5

	return win_rates_table, archetype_frequencies, expected_winrates

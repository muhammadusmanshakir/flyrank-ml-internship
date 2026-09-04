# Capstone Report — Content Refresh

- **Author:** Muhammad Usman Shakir
- **Lane:** Content Refresh
- **Repo:** https://github.com/muhammadusmanshakir/flyrank-ml-internship
- **Date:** September 2026

## 0. Abstract

Which pages should an editorial team review first when deciding what to refresh? This
report uses 30,000 anonymized content pages from FlyRank's Content Refresh dataset,
comparing 90-day traffic and engagement signals against a rolling 30-day window to define
a "declining visibility" label. A Random Forest classifier trained on 23 leak-checked
features reaches F1 0.836 against a transparent staleness-and-visibility baseline rule's
F1 0.352 when both are evaluated on the same random split — but when validated honestly
on clients the model has never seen, ROC-AUC drops from 0.795 to 0.635, a result reported
here in full rather than hidden. The output is a ranked, reason-coded action queue meant
to prioritize human review, not to make unsupervised publishing decisions.

## 1. Problem framing

**Unit of analysis:** one row is one content page.

**Decision this supports:** which pages an editorial team should look at first for a
content refresh, out of a large and growing backlog that no team can review page-by-page
on a fixed schedule.

**Output:** a ranked queue — each page gets a decline-probability score, a reason code
(why it was flagged), and a recommended action ("Review content" or "Monitor").

**Action a human takes:** an editor opens the top of the queue, reviews the flagged
pages against the stated reason, and decides whether to update content, re-optimize a
title, or leave it — the model narrows the list, a person makes the call.

**Cost of a wrong call:** a false positive costs an editor's review time on a page that
didn't need it. A false negative means a declining page goes unreviewed for another
cycle. Neither is catastrophic on its own, which is why this is framed as
decision-support and ranking, not an automated action.

**Why ML helps here:** whether a page is likely to keep declining depends on several
interacting signals at once (staleness, traffic volume, position, content length,
engagement) rather than a single clean threshold. A fixed rule can only use one or two
of these at a time; a model can weigh all of them together and rank pages by relative
risk instead of a binary cutoff.

## 2. Data safety

**Data used:** `content_refresh_anonymized.csv`, the safe starter release for the
Content Refresh lane (30,000 rows, 44 columns). All `content_id` and `client_id` values
are pre-anonymized hashes; no raw client names, URLs, or search queries appear anywhere
in this dataset or in this repo.

**Deliberately excluded from the model's features:**
- `content_id`, `client_id` — identifiers, not predictive signal (client_id is used only
  for grouping in the honest validation split, never as a feature)
- `trend_direction`, `trend_pct` — describe the outcome trend directly and would leak the
  label
- `impressions_last_30d`, `clicks_last_30d`, `sessions_last_30d`,
  `impressions_prev_30d`, `clicks_prev_30d`, `sessions_prev_30d` — these are the exact
  columns used to construct the target; including them as features would let the model
  see the answer

**Leakage risk found and corrected:** an earlier draft of the model used a target
defined as `days_since_last_update >= 90 AND impressions_90d >= 1000` — identical to the
baseline rule — with those same two columns among the model's inputs. That version
scored a perfect 1.0000 across every metric, which is not a good result; it is a
deterministic function of its own inputs. That target was discarded in favor of an
independent, forward-looking one (Section 4).

**Confirmed:** no client-identifying information appears anywhere in `work/`.

## 3. Baseline

**The rule:** flag a page as `"Review content"` if `days_since_last_update >= 90` AND
`impressions_90d >= 1000`; otherwise `"Monitor"`.

**Why these two signals:** both were checked against real data before being trusted.
Staleness (days since last update) and visibility (90-day impressions) were each split
into buckets and inspected with sample sizes printed — both verdicts came back
**CONFIRMED**: stale pages and highly visible pages are meaningfully different in
outcome rate from the rest of the population, so the rule isn't leaning on a signal that
turned out to be noise.

**Fair comparison:** the baseline rule is evaluated as a binary classifier against the
exact same target and the exact same test rows as the model (Section 5), not a
different metric or a different slice of data.

**Baseline numbers (same test split, same target as the model):**

| Metric | Week-4 baseline rule |
|---|---|
| Accuracy | 0.4542 |
| F1-score | 0.3516 |
| Precision | 0.8014 |
| Recall | 0.2252 |

The baseline is precise (0.80) but has low recall (0.23) — it rarely flags a page, and
when it does, it's usually right, but it misses most pages that are actually declining.

## 4. Model / analysis

**Method:** Random Forest Classifier (`n_estimators=200`, `random_state=42`). Chosen
because the signals available are tabular and mixed-scale, and the relationship between
them and a decline in visibility is unlikely to be linear or additive — a tree ensemble
captures interactions between features (e.g., staleness combined with low engagement)
without assuming a fixed functional form, and it yields feature importances for
interpretation.

**Target (one sentence):** `decline_target` = 1 when a page's impressions in the most
recent 30-day window are lower than in the prior 30-day window, else 0 — a forward-moving
signal built only from the two window columns, neither of which is a model feature.

**Features used (23):** `search_volume`, `competition`, `cpc`, `word_count`,
`char_count`, `impressions_90d`, `clicks_90d`, `pageviews_90d`, `sessions_90d`,
`users_90d`, `engaged_sessions_90d`, `ai_sessions_90d`, `scroll_events_90d`,
`days_with_impressions`, `days_with_sessions`, `content_age_days`, `age_tier_order`,
`days_since_last_update`, `ctr`, `avg_position`, `engagement_rate`, `scroll_rate`,
`ai_traffic_pct`.

**Left out on purpose:** the six window columns used to build the target, the two
label-adjacent trend columns, and both ID columns (Section 2).

## 5. Evaluation

**Split used:** two splits, deliberately compared against each other.

1. **Random 80/20, stratified on the target** (`random_state=42`) — the naive default.
2. **`GroupShuffleSplit` grouped by `client_id`, 80/20** — no client appears in both
   train and test. 25 clients in training, 7 held out entirely for testing, overlap
   confirmed to be zero.

The grouped split is the honest one: it measures whether the model generalizes to a
client it has never seen, which is the real deployment scenario. The random split is
shown specifically to demonstrate how much it overstates performance.

**Model vs. baseline, same random split, same target:**

| Metric | Majority-class rate | Week-4 baseline rule | Week-5 Random Forest | Improvement |
|---|---|---|---|---|
| Accuracy | 0.6572 | 0.4542 | 0.7647 | +0.3105 |
| F1-score | — | 0.3516 | 0.8355 | +0.4839 |
| Precision | — | 0.8014 | 0.7727 | −0.0288 |
| Recall | — | 0.2252 | 0.9095 | +0.6843 |
| ROC-AUC | — | — | 0.7952 | — |

**Random split vs. grouped-by-client split, same model, same features:**

| Metric | Random split (naive) | Grouped by client (honest) | Change |
|---|---|---|---|
| Accuracy | 0.7617 | 0.6338 | −0.1279 |
| F1-score | 0.8329 | 0.7268 | −0.1062 |
| Precision | 0.7721 | 0.6835 | −0.0886 |
| Recall | 0.9041 | 0.7759 | −0.1282 |
| ROC-AUC | 0.7951 | 0.6351 | −0.1600 |

**What the errors look like:** of 6,000 test rows (random split), the model produced
1,412 misclassifications (23.5% error rate) — 1,055 false positives and 357 false
negatives, confusion matrix `[[1002, 1055], [357, 3586]]`. The model over-flags more
than it under-flags, which fits its intended use as a review-prioritization tool: a
false positive costs an editor a look, a false negative costs a missed cycle.

## 6. Interpretation

**What the model leans on (top 5 by importance):** `impressions_90d` (0.125),
`avg_position` (0.122), `days_with_impressions` (0.118), `content_age_days` (0.069),
`char_count` (0.062). The model is driven mostly by sustained visibility and average
search position, not by simple content attributes like word count — a page's ongoing
traffic pattern matters more to the prediction than how long the content is.

**Surprise / negative result worth reporting plainly:** the honest, client-grouped
validation shows a substantial drop from the randomly-split numbers — ROC-AUC falls
from 0.795 to 0.635, only modestly above chance. This means the model's ability to
generalize to a brand-new client is real but limited, and the strong random-split
numbers were partly an artifact of the model having seen other pages from the same
clients during training. Reporting the weaker, honest number here rather than the
stronger, naive one is the point of Week 6's exercise.

## 7. Recommendation

The trained model scores all 30,000 pages for `decline_probability` and ranks them
highest-risk first. Each ranked row carries a reason code explaining the likely driver
in plain language, and a recommended action:

| Reason code | Pages | Meaning | Action |
|---|---|---|---|
| LOW_TRAFFIC_SIGNAL | 12,622 | Under 1,000 impressions in the last 90 days | Review search visibility / coverage |
| DECAY_SIGNAL_HIGH | 9,345 | Not updated in 91+ days | Review and refresh stale content |
| REVIEW_REQUIRED | 6,909 | No single dominant signal | Manual content review |
| LOW_CTR_SIGNAL | 1,124 | Click-through rate under 5% | Review title / result presentation |

**How an editor would use this tomorrow:** open the queue, start from rank 1, and work
down as review capacity allows — the reason code tells them what to check first on each
page, without needing to interpret a raw probability.

**Confidence and limits, stated explicitly:** `decline_probability` is produced by a
model fit on all available rows for scoring purposes (not a held-out evaluation), so the
raw probability values skew high (median 0.87) and should not be read as calibrated
confidence — the *relative ranking* is the useful part, not the absolute number. The
model's honestly-validated discrimination on unseen clients (ROC-AUC 0.635) is modest,
so this queue should be treated as a starting point for human review, not a verdict.
**Nothing here should be automated without human review** — no page should be edited,
republished, or deprioritized based solely on this score.

**Monitoring / retrain triggers:** re-score monthly as new 90-day and 30-day windows
roll forward; retrain if the honest (grouped) ROC-AUC on a fresh held-out client sample
drops further from the 0.635 baseline established here, or if the reason-code
distribution shifts sharply from the proportions above, which would suggest the
underlying traffic patterns have changed enough that the model's assumptions no longer
hold.

## 8. Reproducibility

**To re-run from a fresh clone:**
```bash
git clone https://github.com/muhammadusmanshakir/flyrank-ml-internship.git
cd flyrank-ml-internship
pip install -r requirements.txt
```
Then open and run, in order: `work/notebooks/w04_baseline_score.ipynb`,
`work/notebooks/w05_model.ipynb`, `work/notebooks/w06_validation_audit.ipynb`,
`work/notebooks/w07_action_playbook.ipynb`, `work/notebooks/capstone.ipynb`.

**Seeds:** `random_state=42` throughout, for both `train_test_split` and
`GroupShuffleSplit`, and for `RandomForestClassifier`.

**Environment:** Python with `pandas==2.2.3`, `scikit-learn==1.6.1` (see
`requirements.txt` for the full pinned list).

**Sealed evaluation note:** the client-grouped test set (7 clients, held out via
`GroupShuffleSplit` with `random_state=42`) was evaluated once; the cell that builds
this split lives in `work/notebooks/w06_validation_audit.ipynb`, and its output metrics
are printed directly in that notebook's committed, executed output — checkable from the
repo, not taken on faith.

## 9. Acknowledgments & data credit

Built on the [FlyRank ML Internship dataset](https://flyrank.ai).

---

> **Claims checklist before submitting:** observed / measured / directional /
> decision-support language everywhere · no causal claims without an experiment or
> causal design · no "predicted Google's algorithm" · no client-identifying details ·
> numbers in this report match a fresh re-run.

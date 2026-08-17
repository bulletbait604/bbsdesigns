# Cursor Prompt 010 — Image Review

Build AI image quality review.

Check:
- spelling
- typography
- composition
- printability
- obvious IP similarity/risk
- logos
- recognizable characters
- celebrity likeness
- quality

Return:
qualityScore
ipRisk
safetyScore
issues
decision

Default quality threshold: 85.

If uncertain, REVIEW.
Never auto-publish an uncertain design.
